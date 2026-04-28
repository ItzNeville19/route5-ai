"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import {
  EXTRACTION_PROVIDER_OPTIONS,
} from "@/lib/ai-provider-presets";
import { getMarketplaceAppById } from "@/lib/marketplace-catalog";

/** Uses workspace CSS vars only — avoids OS `prefers-color-scheme` overriding signed-in chrome. */
export default function WorkspaceAiSettingsCard() {
  const exp = useWorkspaceExperience();
  const rawExtractionId = exp.prefs.extractionProviderId ?? "auto";
  const supportedIds = useMemo(
    () => new Set(EXTRACTION_PROVIDER_OPTIONS.map((opt) => opt.id)),
    []
  );
  const extractionId = supportedIds.has(rawExtractionId as (typeof EXTRACTION_PROVIDER_OPTIONS)[number]["id"])
    ? rawExtractionId
    : "auto";
  useEffect(() => {
    if (rawExtractionId !== extractionId) {
      exp.setPrefs({ extractionProviderId: extractionId });
    }
  }, [exp, extractionId, rawExtractionId]);
  const enabledFromMarketplace = (exp.prefs.installedMarketplaceAppIds ?? [])
    .map((id) => getMarketplaceAppById(id))
    .filter((a) => a && a.kind === "installable");

  return (
    <section
      className="overflow-hidden rounded-2xl border border-[var(--workspace-border)] bg-[color-mix(in_srgb,var(--workspace-surface)_94%,transparent)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
      aria-labelledby="ai-prefs-heading"
    >
      <div className="border-b border-[var(--workspace-border)] bg-[color-mix(in_srgb,var(--workspace-surface)_88%,transparent)] px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--workspace-accent)_18%,transparent)] text-[var(--workspace-accent)]">
            <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <h2
              id="ai-prefs-heading"
              className="text-[16px] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]"
            >
              AI settings
            </h2>
            <p className="text-[12px] text-[var(--workspace-muted-fg)]">
              Configure how decision capture works in this deployment. Optional connectors live under{" "}
              <Link href="/settings#connections" className="font-medium text-[var(--workspace-accent)] hover:underline">
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
            className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--workspace-muted-fg)]"
          >
            Decision capture mode
          </label>
          <select
            id="extraction-provider"
            value={extractionId}
            onChange={(e) => exp.setPrefs({ extractionProviderId: e.target.value })}
            className="mt-2 w-full max-w-md rounded-xl border border-[#1590ff]/60 bg-[#071326] px-3 py-2.5 text-[16px] text-[#eaf4ff] shadow-[0_0_0_1px_rgba(21,144,255,0.25),0_14px_36px_-20px_rgba(21,144,255,0.45)] focus:border-[#45a8ff] focus:outline-none focus:ring-2 focus:ring-[#45a8ff]/40"
          >
            {EXTRACTION_PROVIDER_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {EXTRACTION_PROVIDER_OPTIONS.find((o) => o.id === extractionId)?.hint ? (
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
              {EXTRACTION_PROVIDER_OPTIONS.find((o) => o.id === extractionId)?.hint}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/65 px-3 py-2.5 text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Model version changes are controlled by deployment environment and server policy, not this page.
        </div>

        {enabledFromMarketplace.length > 0 ? (
          <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--workspace-muted-fg)]">
              Enabled add-ons
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {enabledFromMarketplace.map((a) =>
                a ? (
                  <li key={a.id}>
                    <span className="inline-flex rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-2.5 py-1 text-[12px] font-medium text-[var(--workspace-fg)]">
                      {a.name}
                    </span>
                  </li>
                ) : null
              )}
            </ul>
            <p className="mt-2 text-[11px] text-[var(--workspace-muted-fg)]">
              Installed add-ons now route into the active AI extraction engine when available.
            </p>
          </div>
        ) : null}

        <p className="rounded-xl border border-emerald-500/35 bg-emerald-500/[0.08] px-3 py-2 text-[12px] leading-relaxed text-[var(--workspace-fg)]">
          Route5 uses this mode for both Capture and project intake so behavior is consistent across the product.
        </p>
      </div>
    </section>
  );
}
