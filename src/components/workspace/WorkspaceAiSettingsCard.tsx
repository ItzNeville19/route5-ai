"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import {
  EXTRACTION_PROVIDER_OPTIONS,
  LLM_PROVIDER_OPTIONS,
} from "@/lib/ai-provider-presets";
import { getMarketplaceAppById } from "@/lib/marketplace-catalog";

export default function WorkspaceAiSettingsCard() {
  const exp = useWorkspaceExperience();
  const extractionId = exp.prefs.extractionProviderId ?? "auto";
  const llmId = exp.prefs.llmProviderId ?? "auto";
  const enabledFromMarketplace = (exp.prefs.installedMarketplaceAppIds ?? [])
    .map((id) => getMarketplaceAppById(id))
    .filter((a) => a && a.kind === "installable");

  return (
    <section
      className="overflow-hidden rounded-2xl border border-black/[0.06] bg-gradient-to-b from-white to-neutral-50/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-[var(--workspace-border)] dark:from-[var(--workspace-surface)] dark:to-[var(--workspace-canvas)]/60"
      aria-labelledby="ai-prefs-heading"
    >
      <div className="border-b border-black/[0.04] bg-white/80 px-6 py-4 dark:border-[var(--workspace-border)] dark:bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-sky-500/15 text-violet-600 dark:text-[var(--workspace-accent)]">
            <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <h2
              id="ai-prefs-heading"
              className="text-[16px] font-semibold tracking-[-0.02em] text-neutral-900 dark:text-[var(--workspace-fg)]"
            >
              AI &amp; passes
            </h2>
            <p className="text-[12px] text-neutral-500 dark:text-[var(--workspace-muted-fg)]">
              Used for Desk and project runs. Defaults below apply to structured passes; optional connectors live under{" "}
              <Link href="/settings#connections" className="font-medium text-[#0071e3] hover:underline dark:text-[var(--workspace-accent)]">
                Connections
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-6 py-5">
        <div>
          <label
            htmlFor="extraction-provider"
            className="text-[12px] font-semibold uppercase tracking-[0.08em] text-neutral-500 dark:text-[var(--workspace-muted-fg)]"
          >
            Pass provider
          </label>
          <select
            id="extraction-provider"
            value={extractionId}
            onChange={(e) => exp.setPrefs({ extractionProviderId: e.target.value })}
            className="mt-2 w-full max-w-md rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-[14px] text-neutral-900 shadow-sm focus:border-[#0071e3]/40 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/15 dark:border-[var(--workspace-border)] dark:bg-[var(--workspace-canvas)] dark:text-[var(--workspace-fg)]"
          >
            {EXTRACTION_PROVIDER_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-500 dark:text-[var(--workspace-muted-fg)]">
            {EXTRACTION_PROVIDER_OPTIONS.find((o) => o.id === extractionId)?.hint}
          </p>
        </div>

        <div>
          <label
            htmlFor="llm-provider"
            className="text-[12px] font-semibold uppercase tracking-[0.08em] text-neutral-500 dark:text-[var(--workspace-muted-fg)]"
          >
            Default LLM
          </label>
          <select
            id="llm-provider"
            value={llmId}
            onChange={(e) => exp.setPrefs({ llmProviderId: e.target.value })}
            className="mt-2 w-full max-w-md rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-[14px] text-neutral-900 shadow-sm focus:border-[#0071e3]/40 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/15 dark:border-[var(--workspace-border)] dark:bg-[var(--workspace-canvas)] dark:text-[var(--workspace-fg)]"
          >
            {LLM_PROVIDER_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-500 dark:text-[var(--workspace-muted-fg)]">
            {LLM_PROVIDER_OPTIONS.find((o) => o.id === llmId)?.hint}
          </p>
        </div>

        {enabledFromMarketplace.length > 0 ? (
          <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500 dark:text-[var(--workspace-muted-fg)]">
              Enabled from Marketplace
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {enabledFromMarketplace.map((a) =>
                a ? (
                  <li key={a.id}>
                    <span className="inline-flex rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[12px] font-medium text-neutral-800 dark:border-[var(--workspace-border)] dark:bg-[var(--workspace-surface)] dark:text-[var(--workspace-fg)]">
                      {a.name}
                    </span>
                  </li>
                ) : null
              )}
            </ul>
          </div>
        ) : null}

        <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-3 py-2 text-[12px] leading-relaxed text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-100">
          Hosted Route5 uses the platform <strong>OpenAI</strong> connection when configured by the deployment — you do{" "}
          <strong>not</strong> need to paste an API key in settings. Use the dropdowns below to pick defaults; additional
          providers become active as backends are enabled.
        </p>
      </div>
    </section>
  );
}
