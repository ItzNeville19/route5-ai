import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
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
import {
  insertExtractionRow,
  verifyProjectOwned,
} from "@/lib/workspace/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { projectId?: string; rawInput?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const projectId = body.projectId?.trim();
  const rawInputRaw = typeof body.rawInput === "string" ? body.rawInput : "";
  if (!projectId || !rawInputRaw.trim()) {
    return NextResponse.json(
      { error: "projectId and non-empty rawInput are required" },
      { status: 400 }
    );
  }

  try {
    const owned = await verifyProjectOwned(userId, projectId);
    if (!owned) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawInput = clampRawInput(rawInputRaw);
    const useOpenAI = isOpenAIConfigured();

    let parsed: ExtractionModelResult;
    let extractionMode: "ai" | "offline" = "offline";

    if (useOpenAI) {
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
      decisions: parsed.decisions,
      actionItems,
    });

    return NextResponse.json({
      extractionId: inserted.id,
      summary: parsed.summary,
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
