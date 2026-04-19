import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createOpenAIClient,
  getOpenAIModel,
  isOpenAIConfigured,
} from "@/lib/ai/openai-client";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { normalizeDashboardShortcutList } from "@/lib/dashboard-shortcut-href";
import { deskUrl } from "@/lib/desk-routes";
import {
  cleanText,
  enforceRateLimits,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

type Shortcut = { label: string; href: string };

const customizeBodySchema = z
  .object({
    companyContext: z.string().transform(cleanText).pipe(z.string().max(2000)).optional(),
  })
  .strict();

function heuristicSuggestions(companyContext: string): { note: string; shortcuts: Shortcut[] } {
  const lower = companyContext.toLowerCase();
  const shortcuts: Shortcut[] = [
    { label: "Overview", href: "/overview" },
    { label: "Desk", href: deskUrl() },
    { label: "Marketplace", href: "/marketplace" },
    { label: "Themes", href: "/workspace/customize" },
    { label: "Analytics", href: "/reports" },
    { label: "Connections", href: "/settings#connections" },
  ];
  if (lower.includes("linear") || lower.includes("sprint")) {
    shortcuts.unshift({ label: "Linear", href: "/integrations/linear" });
  }
  if (lower.includes("github") || lower.includes("code")) {
    shortcuts.unshift({ label: "GitHub", href: "/integrations/github" });
  }
  if (lower.includes("slack")) {
    shortcuts.splice(4, 0, { label: "Slack", href: "/integrations/slack" });
  }
  if (lower.includes("figma") || lower.includes("design")) {
    shortcuts.splice(4, 0, { label: "Figma", href: "/integrations/figma" });
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
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "dashboard-customize:post", userId, {
      userLimit: 12,
      ipLimit: 24,
    })
  );
  if (rateLimited) return rateLimited;

  const parsedBody = await parseJsonBody(req, customizeBodySchema);
  if (!parsedBody.ok) return parsedBody.response;

  const companyContext = parsedBody.data.companyContext ?? "";

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
Rules: href must be a path starting with / (e.g. /projects, /desk, /integrations/linear). Never use /dashboard — the workspace overview is /projects. 3–6 shortcuts. Labels ≤24 chars.`,
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
                shortcuts: normalizeDashboardShortcutList(shortcuts),
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
    return NextResponse.json({
      ...h,
      shortcuts: normalizeDashboardShortcutList(h.shortcuts),
      mode: "offline" as const,
    });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}
