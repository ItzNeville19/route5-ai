"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";

const PINNED_OPTIONS = [
  { id: "queue", label: "Assistant" },
  { id: "escalations", label: "Issues" },
  { id: "activity", label: "History" },
  { id: "commitments", label: "Commitments" },
  { id: "customize", label: "Customize" },
] as const;

export default function CommandCenterCustomizeSection() {
  const exp = useWorkspaceExperience();
  const pinned = exp.prefs.pinnedCommandActions ?? ["queue", "escalations", "activity"];

  const togglePinned = useCallback(
    (id: string) => {
      const set = new Set(pinned);
      if (set.has(id)) set.delete(id);
      else if (set.size < 6) set.add(id);
      exp.setPrefs({ pinnedCommandActions: [...set] });
    },
    [exp, pinned]
  );

  return (
    <section
      id="welcome-hero"
      className="relative mt-8 scroll-mt-24 overflow-hidden rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/95 shadow-[0_20px_56px_-32px_rgba(99,102,241,0.14)] backdrop-blur-md"
      aria-labelledby="cmd-cc-heading"
    >
      <div className="relative p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--workspace-muted-fg)]">
          Command center
        </p>
        <h2 id="cmd-cc-heading" className="mt-1 text-[clamp(1.1rem,2.6vw,1.35rem)] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]">
          Dashboard & welcome hero
        </h2>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Adjust density, accents, and pinned shortcuts under your welcome card on{" "}
          <Link href="/workspace/dashboard" className="font-medium text-[var(--workspace-accent)] hover:underline">
            Home
          </Link>
          . Theme, gradients, and photo vs mesh for the shell and welcome hero live in the{" "}
          <Link href="/workspace/customize#appearance" className="font-medium text-[var(--workspace-accent)] hover:underline">
            Appearance
          </Link>{" "}
          section (above when you open Customize from the header).
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block text-[13px] font-medium text-[var(--workspace-fg)]">
            Density
            <select
              value={exp.prefs.commandCenterDensity ?? "comfortable"}
              onChange={(e) =>
                exp.setPrefs({
                  commandCenterDensity: e.target.value === "compact" ? "compact" : "comfortable",
                })
              }
              className="mt-2 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2.5 text-[13px] text-[var(--workspace-fg)]"
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>

          <label className="block text-[13px] font-medium text-[var(--workspace-fg)]">
            Welcome hero style
            <select
              value={exp.prefs.welcomeHeroStyle ?? "atmospheric"}
              onChange={(e) =>
                exp.setPrefs({
                  welcomeHeroStyle:
                    e.target.value === "minimal"
                      ? "minimal"
                      : e.target.value === "glass"
                        ? "glass"
                        : "atmospheric",
                })
              }
              className="mt-2 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2.5 text-[13px] text-[var(--workspace-fg)]"
            >
              <option value="atmospheric">Atmospheric</option>
              <option value="minimal">Minimal</option>
              <option value="glass">Glass</option>
            </select>
          </label>

          <label className="block text-[13px] font-medium text-[var(--workspace-fg)]">
            Accent intensity
            <select
              value={exp.prefs.accentIntensity ?? "medium"}
              onChange={(e) =>
                exp.setPrefs({
                  accentIntensity:
                    e.target.value === "subtle"
                      ? "subtle"
                      : e.target.value === "strong"
                        ? "strong"
                        : "medium",
                })
              }
              className="mt-2 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2.5 text-[13px] text-[var(--workspace-fg)]"
            >
              <option value="subtle">Subtle</option>
              <option value="medium">Medium</option>
              <option value="strong">Strong</option>
            </select>
          </label>

          <label className="block text-[13px] font-medium text-[var(--workspace-fg)]">
            Default dashboard mode
            <select
              value={exp.prefs.defaultWorkspaceView ?? "admin"}
              onChange={(e) =>
                exp.setPrefs({ defaultWorkspaceView: e.target.value === "employee" ? "employee" : "admin" })
              }
              className="mt-2 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2.5 text-[13px] text-[var(--workspace-fg)]"
            >
              <option value="admin">Lead view — team overview</option>
              <option value="employee">My work — my commitments</option>
            </select>
          </label>
        </div>

        <label className="mt-6 block text-[13px] font-medium text-[var(--workspace-fg)]">
          Location label on welcome card
          <input
            type="text"
            placeholder="Optional override, e.g. Las Vegas, NV"
            value={exp.prefs.heroLocationOverride ?? ""}
            onChange={(e) => exp.setPrefs({ heroLocationOverride: e.target.value.trim() || undefined })}
            className="mt-2 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2.5 text-[13px] text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)]/70"
          />
          <span className="mt-1 block text-[11px] text-[var(--workspace-muted-fg)]">
            Leave empty to derive from timezone and region in{" "}
            <Link href="/settings#workspace-prefs" className="font-medium text-[var(--workspace-accent)] hover:underline">
              settings
            </Link>
            .
          </span>
        </label>

        <div className="mt-6">
          <p className="text-[13px] font-medium text-[var(--workspace-fg)]">Pinned quick actions (up to 6)</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PINNED_OPTIONS.map((opt) => {
              const on = pinned.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => togglePinned(opt.id)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
                    on
                      ? "border-[var(--workspace-accent)]/50 bg-[var(--workspace-accent)]/15 text-[var(--workspace-fg)]"
                      : "border-[var(--workspace-border)] text-[var(--workspace-muted-fg)] hover:border-[var(--workspace-accent)]/35"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--workspace-border)]/80 pt-5">
          <button
            type="button"
            onClick={() =>
              exp.setPrefs({
                dashboardSectionOrder: ["attention", "insights", "operations", "movement"],
              })
            }
            className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-2.5 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-canvas)]"
          >
            Reset section order
          </button>
          <button
            type="button"
            onClick={() =>
              exp.setPrefs({
                pinnedCommandActions: ["queue", "escalations", "activity"],
                welcomeHeroPalette: 0,
              })
            }
            className="rounded-xl border border-[var(--workspace-border)] px-4 py-2.5 text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-canvas)]/80 hover:text-[var(--workspace-fg)]"
          >
            Reset pins & hero defaults
          </button>
        </div>
      </div>
    </section>
  );
}
