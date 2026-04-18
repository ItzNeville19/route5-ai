"use client";

import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

/** Shows live configuration status from workspace summary (same source as Overview). */
export default function IntegrationStatusStrip() {
  const { summary, loadingSummary } = useWorkspaceData();
  const r = summary.readiness;

  if (loadingSummary || !r) {
    return (
      <p className="mt-4 text-[13px] text-[var(--workspace-muted-fg)]">Checking integration status…</p>
    );
  }

  const items = [
    { label: "OpenAI decision capture", ok: r.openai },
    { label: "Linear API", ok: r.linear },
    { label: "GitHub API", ok: r.github },
    { label: "Figma API", ok: r.figma },
  ];

  return (
    <div
      className="mt-6 flex flex-wrap gap-2"
      role="status"
      aria-label="Integration configuration status"
    >
      {items.map((x) => (
        <span
          key={x.label}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium ${
            x.ok
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-[var(--workspace-border)] bg-[var(--workspace-surface)]/60 text-[var(--workspace-muted-fg)]"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${x.ok ? "bg-emerald-400" : "bg-[var(--workspace-muted-fg)]"}`}
            aria-hidden
          />
          {x.label}
          {x.ok ? " · live" : " · not configured"}
        </span>
      ))}
    </div>
  );
}
