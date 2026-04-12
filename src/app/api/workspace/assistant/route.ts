import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  createOpenAIClient,
  getOpenAIModel,
  isOpenAIConfigured,
} from "@/lib/ai/openai-client";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  getWorkspaceSummaryForUser,
  listProjectsForUser,
} from "@/lib/workspace/store";
import { MERIDIAN_FULL } from "@/lib/assistant-brand";
import {
  cleanText,
  enforceRateLimits,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const relayTurnSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().transform(cleanText).pipe(z.string().min(1).max(12000)),
  })
  .strict();

/** Full transcript so Relay remembers the thread (ChatGPT-style). */
const assistantBodySchema = z
  .object({
    conversation: z.array(relayTurnSchema).min(1).max(40),
    memory: z.string().transform(cleanText).pipe(z.string().max(4000)).optional(),
    firstName: z.string().transform(cleanText).pipe(z.string().max(80)).optional(),
  })
  .strict();

function normalizeRelayTurns(
  turns: z.infer<typeof relayTurnSchema>[]
): z.infer<typeof relayTurnSchema>[] {
  const out = [...turns];
  while (out.length > 0 && out[0]!.role === "assistant") {
    out.shift();
  }
  return out.slice(-24);
}

function heuristicReply(
  message: string,
  ctx: {
    firstName: string;
    projectCount: number;
    extractionCount: number;
    recentProjectNames: string[];
  }
): string {
  const m = message.toLowerCase().trim();
  if (!m) {
    return "Ask me about projects, extractions, integrations, or what to do next.";
  }
  if (m.includes("help") || m.includes("lost") || m.includes("start")) {
    return `Hi ${ctx.firstName} — here’s the fast path: (1) Create a project on Projects. (2) Open it and paste text. (3) Run extraction. Use the sidebar for Desk, Apps, and Integrations. Pin projects you use often.`;
  }
  if (m.includes("project") && ctx.projectCount === 0) {
    return "You don’t have a project yet. Go to Projects → name one (e.g. “Q4 planning”) → Create. Then open it to run extractions.";
  }
  if (m.includes("template")) {
    return "Templates (Decision, Meeting, …) jump you into a project with the composer pre-filled. Pick one on the Projects page or use ?preset= on a project URL.";
  }
  if (m.includes("linear") || m.includes("github") || m.includes("integrat")) {
    return "Open Integrations — Linear and GitHub work immediately with samples and imports. Link your org anytime for live sync.";
  }
  if (m.includes("desk")) {
    return "Desk is your capture surface — use it to draft before you file into a project.";
  }
  if (ctx.recentProjectNames.length > 0 && (m.includes("which") || m.includes("last"))) {
    return `Recent context: you’ve worked in “${ctx.recentProjectNames[0]}”. Open it from the sidebar or Projects.`;
  }
  return `You have ${ctx.projectCount} project(s) and ${ctx.extractionCount} extraction run(s). Tell me “help” for steps, or ask about integrations and templates.`;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "assistant:post", userId, {
      userLimit: 20,
      ipLimit: 40,
    })
  );
  if (rateLimited) return rateLimited;

  const parsedBody = await parseJsonBody(req, assistantBodySchema);
  if (!parsedBody.ok) return parsedBody.response;

  const normalized = normalizeRelayTurns(parsedBody.data.conversation);
  if (normalized.length === 0) {
    return NextResponse.json(
      { error: "Conversation must include at least one user message." },
      { status: 400 }
    );
  }
  const lastUser = [...normalized].reverse().find((t) => t.role === "user");
  const message = lastUser?.content ?? "";
  const memory = parsedBody.data.memory ?? "";
  const firstName = parsedBody.data.firstName || "there";

  try {
    const summary = await getWorkspaceSummaryForUser(userId);
    const projects = await listProjectsForUser(userId);
    const recentProjectNames = projects.slice(0, 3).map((p) => p.name);

    const ctx = {
      firstName,
      projectCount: summary.projectCount,
      extractionCount: summary.extractionCount,
      recentProjectNames,
    };

    if (isOpenAIConfigured()) {
      try {
        const openai = createOpenAIClient();
        const model = getOpenAIModel();
        const system = `You are ${MERIDIAN_FULL}, the in-app workspace helper. Stay in character across turns: read the full thread and answer the latest user message in context. Be concise, friendly, iMessage-short. You know:
- User’s first name: ${firstName}
- Projects: ${summary.projectCount}, extractions: ${summary.extractionCount}
- Recent project names: ${recentProjectNames.join(", ") || "none"}
- User notes (memory): ${memory || "none"}
Only give accurate product advice: projects hold extractions; paste text and run extraction; integrations for Linear/GitHub; Desk for capture. You can suggest navigation: link users to /projects, /desk, /integrations, /workspace/apps, /settings, /docs/product. No claiming features that don’t exist.`;

        const chatMessages = normalized.map((t) => ({
          role: t.role as "user" | "assistant",
          content: t.content,
        }));

        const completion = await openai.chat.completions.create({
          model,
          temperature: 0.35,
          max_tokens: 700,
          messages: [{ role: "system", content: system }, ...chatMessages],
        });
        const reply = completion.choices[0]?.message?.content?.trim();
        if (reply) {
          return NextResponse.json({ reply, mode: "ai" as const });
        }
      } catch {
        /* fall through to heuristic */
      }
    }

    const reply = heuristicReply(message, ctx);
    return NextResponse.json({ reply, mode: "offline" as const });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}
