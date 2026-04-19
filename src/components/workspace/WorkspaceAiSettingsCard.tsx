"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import {
  EXTRACTION_PROVIDER_OPTIONS,
} from "@/lib/ai-provider-presets";
import { getMarketplaceAppById } from "@/lib/marketplace-catalog";

export default function WorkspaceAiSettingsCard() {
  const exp = useWorkspaceExperience();
  const extractionId = exp.prefs.extractionProviderId ?? "auto";
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
              AI settings
            </h2>
            <p className="text-[12px] text-neutral-500 dark:text-[var(--workspace-muted-fg)]">
              Configure how decision capture works in this deployment. Optional connectors live under{" "}
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
            Decision capture mode
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
          {EXTRACTION_PROVIDER_OPTIONS.find((o) => o.id === extractionId)?.hint ? (
            <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-500 dark:text-[var(--workspace-muted-fg)]">
              {EXTRACTION_PROVIDER_OPTIONS.find((o) => o.id === extractionId)?.hint}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-black/[0.06] bg-white/60 px-3 py-2.5 text-[12px] leading-relaxed text-neutral-600 dark:border-[var(--workspace-border)] dark:bg-[var(--workspace-canvas)]/60 dark:text-[var(--workspace-muted-fg)]">
          Model version changes are controlled by deployment environment and server policy, not this page.
        </div>

        {enabledFromMarketplace.length > 0 ? (
          <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500 dark:text-[var(--workspace-muted-fg)]">
              Enabled add-ons
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
          Route5 uses this mode for both Capture and project intake so behavior is consistent across the product.
        </p>
      </div>
    </section>
  );
}
