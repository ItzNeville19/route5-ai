"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";

export default function DashboardCustomizeSection() {
  const exp = useWorkspaceExperience();
  const { t } = useI18n();
  const [ctx, setCtx] = useState("");
  useEffect(() => {
    const n = exp.prefs.dashboardCompanyNote?.trim();
    if (n) setCtx(n);
  }, [exp.prefs.dashboardCompanyNote]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  const saveNote = useCallback(() => {
    exp.setPrefs({ dashboardCompanyNote: ctx.trim() || undefined });
    setSavedFlash("Saved.");
    window.setTimeout(() => setSavedFlash(null), 2200);
  }, [ctx, exp]);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSavedFlash(null);
    try {
      const res = await fetch("/api/workspace/dashboard-customize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ companyContext: ctx }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        note?: string;
        shortcuts?: { label: string; href: string }[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not generate suggestions.");
        return;
      }
      if (data.note) {
        exp.setPrefs({
          dashboardCompanyNote: data.note,
          dashboardAiShortcuts: data.shortcuts ?? [],
        });
        setCtx(data.note.slice(0, 500));
      }
      setSavedFlash(
        data.shortcuts?.length
          ? "Overview subtitle and quick links updated."
          : "Subtitle saved."
      );
      window.setTimeout(() => setSavedFlash(null), 3200);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }, [ctx, exp]);

  const resetLayout = useCallback(() => {
    exp.setPrefs({
      dashboardCompanyNote: undefined,
      dashboardAiShortcuts: [],
    });
    setCtx("");
    setError(null);
    setSavedFlash("Overview subtitle and quick links cleared.");
    window.setTimeout(() => setSavedFlash(null), 3200);
  }, [exp]);

  return (
    <section
      id="dashboard-customize"
      className="relative scroll-mt-24 overflow-hidden rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/95 shadow-[0_20px_56px_-32px_rgba(99,102,241,0.14)] backdrop-blur-md"
      aria-labelledby="dash-custom-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4] [background:radial-gradient(100%_80%_at_100%_0%,rgba(99,102,241,0.1),transparent_50%)]"
        aria-hidden
      />
      <div className="relative p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--workspace-muted-fg)]">
              Overview
            </p>
            <h2
              id="dash-custom-heading"
              className="mt-1 text-[clamp(1.1rem,2.6vw,1.35rem)] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]"
            >
              Overview subtitle
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)] sm:mx-0">
              Describe your org, workflow, and tools. Route5 can suggest a cleaner subtitle and a few quick
              links for the Overview page.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-[12px] text-[var(--workspace-muted-fg)] sm:mx-0">
              <Link href="/settings#workspace-lang" className="font-medium text-[var(--workspace-accent)] hover:underline">
                {t("lang.section")}
              </Link>
              {" · "}
              <Link href="/settings#workspace-prefs" className="font-medium text-[var(--workspace-accent)] hover:underline">
                {t("prefs.timePlace")}
              </Link>
              {" · "}
              <Link href="/settings#workspace-surface" className="font-medium text-[var(--workspace-accent)] hover:underline">
                {t("prefs.surfaceMaterialLabel")}
              </Link>
              {" · "}
              <Link href="/settings#connections" className="font-medium text-[var(--workspace-accent)] hover:underline">
                {t("sidebar.integrations")}
              </Link>
            </p>
          </div>
        </div>
        <label className="mt-5 block text-left">
          <span className="sr-only">Company or team context</span>
          <textarea
            value={ctx}
            onChange={(e) => setCtx(e.target.value)}
            placeholder="e.g. Series B fintech — SOC2, Linear + GitHub, desk-heavy capture…"
            rows={3}
            className="w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-4 py-3 text-[14px] text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)]/70 focus:border-[var(--workspace-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/15"
          />
        </label>
        {error ? (
          <p className="mt-2 text-[13px] text-red-600 dark:text-red-400" role="status">
            {error}
          </p>
        ) : null}
        {savedFlash ? (
          <p className="mt-2 text-[12px] font-medium text-emerald-600 dark:text-emerald-400/90" role="status">
            {savedFlash}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <button
            type="button"
            disabled={loading}
            onClick={() => void generate()}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--workspace-fg)] px-5 py-2.5 text-[13px] font-semibold text-[var(--workspace-canvas)] shadow-md transition hover:opacity-95 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden />
            )}
            Generate suggestion
          </button>
          <button
            type="button"
            onClick={saveNote}
            className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-2.5 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-canvas)]"
          >
            Save subtitle
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 border-t border-[var(--workspace-border)]/80 pt-4 sm:justify-start">
          <button
            type="button"
            onClick={resetLayout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--workspace-border)] px-3 py-2 text-[12px] font-medium text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-canvas)]/80 hover:text-[var(--workspace-fg)]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset layout
          </button>
        </div>
        {exp.prefs.dashboardAiShortcuts && exp.prefs.dashboardAiShortcuts.length > 0 ? (
          <p className="mt-4 text-center text-[12px] text-[var(--workspace-muted-fg)] sm:text-left">
            Active quick links:{" "}
            {exp.prefs.dashboardAiShortcuts.map((s) => s.label).join(" · ")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
