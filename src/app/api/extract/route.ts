import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  clampRawInput,
  parseExtractionJson,
  type ActionItemStored,
  type ExtractionModelResult,
} from "@/lib/ai/schema";
import { EXTRACTION_SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { APIError } from "openai";
import { buildOfflineExtraction } from "@/lib/ai/offline-extraction";
import { publicAIServiceError, publicWorkspaceError } from "@/lib/public-api-message";
import {
  createOpenAIClient,
  getOpenAIModel,
  isOpenAIConfigured,
} from "@/lib/ai/openai-client";
import { getLimitsForTier, resolveTierForUser } from "@/lib/entitlements";
import {
  countExtractionsThisUtcMonthForUser,
  insertCommitmentsFromExtractionActionItems,
  insertExtractionRow,
  verifyProjectOwned,
} from "@/lib/workspace/store";
import { resolveExtractionRoute } from "@/lib/ai-provider-presets";
import {
  cleanText,
  enforceRateLimits,
  extractionProviderSchema,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const extractBodySchema = z
  .object({
    projectId: z.string().transform(cleanText).pipe(z.string().uuid()),
    rawInput: z.string().transform(cleanText).pipe(z.string().min(1).max(100_000)),
    extractionProviderId: extractionProviderSchema.optional(),
  })
  .strict();

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "extract:post", userId, {
      userLimit: 12,
      ipLimit: 24,
      userWindowMs: 60_000,
      ipWindowMs: 60_000,
    })
  );
  if (rateLimited) return rateLimited;

  const parsedBody = await parseJsonBody(req, extractBodySchema);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const { projectId, rawInput: rawInputRaw, extractionProviderId } = parsedBody.data;
    const owned = await verifyProjectOwned(userId, projectId);
    if (!owned) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let email: string | undefined;
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      email =
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        undefined;
    } catch {
      email = undefined;
    }
    const tier = resolveTierForUser(userId, email);
    const { maxExtractionsPerMonth } = getLimitsForTier(tier);
    const monthCount = await countExtractionsThisUtcMonthForUser(userId);
    if (monthCount >= maxExtractionsPerMonth) {
      return NextResponse.json(
        {
          error: `Monthly extraction limit reached (${maxExtractionsPerMonth}) for your plan. Upgrade under Account → Plans or contact sales.`,
          code: "LIMIT_EXTRACTIONS_MONTH",
        },
        { status: 403 }
      );
    }

    const rawInput = clampRawInput(rawInputRaw);
    const openaiConfigured = isOpenAIConfigured();
    const route = resolveExtractionRoute(extractionProviderId, openaiConfigured);

    let parsed: ExtractionModelResult;
    let extractionMode: "ai" | "offline" = "offline";

    if (route === "openai") {
      extractionMode = "ai";
      const model = getOpenAIModel();
      let content: string;
      try {
        const openai = createOpenAIClient();
        const completion = await openai.chat.completions.create({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
            {
              role: "user",
              content: `Analyze the following text:\n\n---\n${rawInput}\n---`,
            },
          ],
        });
        const choice = completion.choices[0]?.message?.content;
        if (!choice) {
          return NextResponse.json(
            { error: publicAIServiceError(null) },
            { status: 503 }
          );
        }
        content = choice;
      } catch (e) {
        let httpStatus = 503;
        if (e instanceof APIError && e.status === 429) {
          httpStatus = 429;
        }
        return NextResponse.json(
          { error: publicAIServiceError(e) },
          { status: httpStatus }
        );
      }

      try {
        parsed = parseExtractionJson(content);
      } catch (e) {
        return NextResponse.json(
          { error: publicAIServiceError(e) },
          { status: 503 }
        );
      }
    } else {
      parsed = buildOfflineExtraction(rawInput);
    }

    const actionItems: ActionItemStored[] = parsed.actionItems.map((a) => ({
      id: nanoid(),
      text: a.text,
      owner: a.owner ?? null,
      completed: false,
    }));

    const inserted = await insertExtractionRow({
      userId,
      projectId,
      rawInput,
      summary: parsed.summary,
      problem: parsed.problem,
      solution: parsed.solution,
      openQuestions: parsed.openQuestions,
      decisions: parsed.decisions,
      actionItems,
    });

    try {
      await insertCommitmentsFromExtractionActionItems(
        userId,
        projectId,
        inserted.id,
        actionItems
      );
    } catch (syncErr) {
      console.error("[route5] commitments sync from extraction failed", syncErr);
    }

    return NextResponse.json({
      extractionId: inserted.id,
      summary: parsed.summary,
      problem: parsed.problem,
      solution: parsed.solution,
      openQuestions: parsed.openQuestions,
      decisions: parsed.decisions,
      actionItems,
      mode: extractionMode,
    });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}
