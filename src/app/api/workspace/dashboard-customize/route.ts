import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createOpenAIClient,
  getOpenAIModel,
  isOpenAIConfigured,
} from "@/lib/ai/openai-client";
import { publicWorkspaceError } from "@/lib/public-api-message";

export const runtime = "nodejs";

type Shortcut = { label: string; href: string };

function heuristicSuggestions(companyContext: string): { note: string; shortcuts: Shortcut[] } {
  const lower = companyContext.toLowerCase();
  const shortcuts: Shortcut[] = [
    { label: "Projects", href: "/projects" },
    { label: "Desk", href: "/desk" },
    { label: "Integrations", href: "/integrations" },
  ];
  if (lower.includes("linear") || lower.includes("sprint")) {
    shortcuts.unshift({ label: "Linear", href: "/integrations/linear" });
  }
  if (lower.includes("github") || lower.includes("code")) {
    shortcuts.unshift({ label: "GitHub", href: "/integrations/github" });
  }
  if (lower.includes("legal") || lower.includes("compliance")) {
    shortcuts.push({ label: "Documentation", href: "/docs/product" });
  }
  const note =
    companyContext.trim().length > 0
      ? `Workspace tuned for: ${companyContext.slice(0, 200)}${companyContext.length > 200 ? "…" : ""} — shortcuts below match common next steps.`
      : "Add a short company or team focus above and tap Generate to tailor jump links and this subtitle.";
  return { note, shortcuts: shortcuts.slice(0, 6) };
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { companyContext?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const companyContext =
    typeof body.companyContext === "string" ? body.companyContext.slice(0, 2000) : "";

  try {
    if (isOpenAIConfigured()) {
      try {
        const openai = createOpenAIClient();
        const model = getOpenAIModel();
        const completion = await openai.chat.completions.create({
          model,
          temperature: 0.35,
          max_tokens: 500,
          messages: [
            {
              role: "system",
              content: `You help configure a B2B workspace dashboard. Reply ONLY with valid JSON, no markdown:
{"note":"One short subtitle (max 220 chars) for the dashboard hero, professional tone.",
"shortcuts":[{"label":"string","href":"string"}]}
Rules: href must be a path starting with / (e.g. /projects, /desk, /integrations/linear). 3–6 shortcuts. Labels ≤24 chars.`,
            },
            {
              role: "user",
              content: `Company / team context:\n${companyContext || "(empty — suggest generic executive workspace shortcuts)"}`,
            },
          ],
        });
        const raw = completion.choices[0]?.message?.content?.trim();
        if (raw) {
          const parsed = JSON.parse(raw) as {
            note?: string;
            shortcuts?: Shortcut[];
          };
          if (parsed.note && Array.isArray(parsed.shortcuts)) {
            const shortcuts = parsed.shortcuts
              .filter(
                (s) =>
                  s &&
                  typeof s.label === "string" &&
                  typeof s.href === "string" &&
                  s.href.startsWith("/")
              )
              .slice(0, 6);
            if (shortcuts.length > 0) {
              return NextResponse.json({
                note: parsed.note.slice(0, 280),
                shortcuts,
                mode: "ai" as const,
              });
            }
          }
        }
      } catch {
        /* fall through */
      }
    }

    const h = heuristicSuggestions(companyContext);
    return NextResponse.json({ ...h, mode: "offline" as const });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}
