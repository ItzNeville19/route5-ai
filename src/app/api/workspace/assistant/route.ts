import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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

export const runtime = "nodejs";

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

  let body: { message?: string; memory?: string; firstName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.slice(0, 8000) : "";
  const memory = typeof body.memory === "string" ? body.memory.slice(0, 4000) : "";
  const firstName =
    typeof body.firstName === "string" && body.firstName.trim()
      ? body.firstName.trim()
      : "there";

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
        const system = `You are ${MERIDIAN_FULL}, the in-app workspace helper. Be concise, friendly, iMessage-short. You know:
- User’s first name: ${firstName}
- Projects: ${summary.projectCount}, extractions: ${summary.extractionCount}
- Recent project names: ${recentProjectNames.join(", ") || "none"}
- User notes (memory): ${memory || "none"}
Only give accurate product advice: projects hold extractions; paste text and run extraction; integrations for Linear/GitHub; Desk for capture. No claiming features that don’t exist.`;

        const completion = await openai.chat.completions.create({
          model,
          temperature: 0.4,
          max_tokens: 500,
          messages: [
            { role: "system", content: system },
            { role: "user", content: message || "What should I do next?" },
          ],
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
