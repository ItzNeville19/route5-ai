"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAlignedMinuteTick } from "@/hooks/use-aligned-minute-tick";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import {
  WORKSPACE_THEME_AUTO_DESCRIPTION,
  WORKSPACE_THEME_DESCRIPTIONS,
  WORKSPACE_THEME_IDS,
  WORKSPACE_THEME_OPTION_LABELS,
  resolveWorkspaceTheme,
  type WorkspaceThemeId,
} from "@/lib/workspace-themes";

function ThemePreviewSwatch({ id }: { id: Exclude<WorkspaceThemeId, "auto"> }) {
  const base = "relative h-14 w-full overflow-hidden rounded-lg border shadow-inner";
  const inner = "absolute inset-0";
  switch (id) {
    case "daytime":
      return (
        <div className={`${base} border-slate-200/90 bg-white`}>
          <div className={`${inner} bg-gradient-to-br from-white via-slate-50 to-slate-100`} />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-white shadow-sm ring-1 ring-slate-200/80" />
        </div>
      );
    case "morning":
      return (
        <div className={`${base} border-amber-200/80 bg-[#fff7ed]`}>
          <div className={`${inner} bg-gradient-to-br from-amber-50 via-orange-50/80 to-amber-100/60`} />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-[#fffaf5] shadow-sm ring-1 ring-amber-200/60" />
        </div>
      );
    case "sunrise":
      return (
        <div className={`${base} border-rose-200/70 bg-[#fff1f2]`}>
          <div
            className={`${inner} bg-[linear-gradient(145deg,rgba(255,251,235,0.95)_0%,rgba(255,228,230,0.9)_45%,rgba(186,230,253,0.35)_100%)]`}
          />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-white/90 shadow-sm ring-1 ring-rose-200/50" />
        </div>
      );
    case "sunset":
      return (
        <div className={`${base} border-orange-200/75 bg-[#ffedd5]`}>
          <div
            className={`${inner} bg-[linear-gradient(200deg,rgba(255,247,237,0.98)_0%,rgba(254,215,170,0.95)_42%,rgba(233,213,255,0.45)_100%)]`}
          />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-[#fff7ed] shadow-sm ring-1 ring-orange-200/55" />
        </div>
      );
    case "ember":
      return (
        <div className={`${base} border-rose-300/70 bg-[#ffe4e6]`}>
          <div
            className={`${inner} bg-[linear-gradient(198deg,rgba(255,245,245,0.98)_0%,rgba(254,205,211,0.92)_45%,rgba(127,29,29,0.18)_100%)]`}
          />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-[#fff1f2] shadow-sm ring-1 ring-rose-300/55" />
        </div>
      );
    case "studio":
      return (
        <div className={`${base} border-stone-300/70 bg-[#f5f5f4]`}>
          <div
            className={`${inner} bg-[linear-gradient(188deg,#fafaf9_0%,#f5f5f4_45%,#e7e5e4_100%)]`}
          />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-[#fafaf9] shadow-sm ring-1 ring-stone-300/60" />
        </div>
      );
    case "forest":
      return (
        <div className={`${base} border-emerald-200/70 bg-[#ecfdf5]`}>
          <div
            className={`${inner} bg-[radial-gradient(ellipse_100%_80%_at_12%_0%,rgba(52,211,153,0.35),transparent_54%),linear-gradient(188deg,#f0fdf4_0%,#ecfdf5_45%,#d1fae5_100%)]`}
          />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-white/95 shadow-sm ring-1 ring-emerald-200/55" />
        </div>
      );
    case "ocean":
      return (
        <div className={`${base} border-cyan-600/30 bg-[#0369a1]`}>
          <div
            className={`${inner} bg-[radial-gradient(ellipse_100%_80%_at_50%_-10%,rgba(186,230,253,0.5),transparent_55%),linear-gradient(185deg,#ecfeff_0%,#0ea5e9_45%,#0c4a6e_100%)]`}
          />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-cyan-100/90 shadow-sm ring-1 ring-cyan-500/40" />
        </div>
      );
    case "lagunabeach":
      return (
        <div className={`${base} border-teal-400/50 bg-[#ccfbf1]`}>
          <div
            className={`${inner} bg-[linear-gradient(165deg,#f0fdfa_0%,#5eead4_55%,#0f766e_100%)]`}
          />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-emerald-50/95 shadow-sm ring-1 ring-teal-400/45" />
        </div>
      );
    case "sanfrancisco":
      return (
        <div className={`${base} border-slate-400/50 bg-[#e0e7ff]`}>
          <div
            className={`${inner} bg-[linear-gradient(175deg,#f8fafc_0%,#cbd5e1_55%,#64748b_100%)]`}
          />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-slate-100/90 shadow-sm ring-1 ring-slate-400/45" />
        </div>
      );
    case "nevada":
      return (
        <div className={`${base} border-amber-300/60 bg-[#fde68a]`}>
          <div
            className={`${inner} bg-[linear-gradient(188deg,#fffbeb_0%,#fbbf24_50%,#b45309_100%)]`}
          />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-amber-50/95 shadow-sm ring-1 ring-amber-300/55" />
        </div>
      );
    case "mumbai":
      return (
        <div className={`${base} border-amber-400/55 bg-[#fef3c7]`}>
          <div
            className={`${inner} bg-[radial-gradient(ellipse_90%_70%_at_20%_0%,rgba(251,191,36,0.35),transparent_54%),linear-gradient(185deg,#fffbeb_0%,#fcd34d_100%)]`}
          />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-amber-50/95 shadow-sm ring-1 ring-amber-400/50" />
        </div>
      );
    case "columbia":
      return (
        <div className={`${base} border-stone-400/55 bg-[#faf7f2]`}>
          <div
            className={`${inner} bg-[linear-gradient(185deg,#fafaf9_0%,#e7e5e4_55%,#57534e_100%)]`}
          />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-stone-50/95 shadow-sm ring-1 ring-stone-400/45" />
        </div>
      );
    case "vegas":
      return (
        <div className={`${base} border-fuchsia-500/35 bg-[#1a0a2e]`}>
          <div
            className={`${inner} bg-[radial-gradient(ellipse_100%_85%_at_50%_-15%,rgba(168,85,247,0.55),transparent_56%),linear-gradient(185deg,#581c87_0%,#1a0a2e_60%,#0f0518_100%)]`}
          />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-purple-950/90 ring-1 ring-fuchsia-500/35" />
        </div>
      );
    case "nyc":
      return (
        <div className={`${base} border-sky-500/35 bg-[#0f172a]`}>
          <div
            className={`${inner} bg-[radial-gradient(ellipse_100%_75%_at_50%_-12%,rgba(56,189,248,0.35),transparent_55%),linear-gradient(185deg,#1e293b_0%,#0f172a_55%,#020617_100%)]`}
          />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-slate-900/90 ring-1 ring-sky-500/30" />
        </div>
      );
    case "pink":
      return (
        <div className={`${base} border-pink-300/60 bg-[#fdf2f8]`}>
          <div
            className={`${inner} bg-[radial-gradient(ellipse_100%_80%_at_20%_0%,rgba(244,114,182,0.4),transparent_55%),radial-gradient(ellipse_90%_70%_at_100%_10%,rgba(217,70,239,0.22),transparent_52%),linear-gradient(185deg,#fff1f2_0%,#fce7f3_50%,#fbcfe8_100%)]`}
          />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-white/90 shadow-sm ring-1 ring-pink-200/60" />
        </div>
      );
    case "cosmic":
      return (
        <div className={`${base} border-cyan-500/20 bg-[#030712]`}>
          <div
            className={`${inner} bg-[radial-gradient(ellipse_100%_85%_at_50%_-15%,rgba(99,102,241,0.45),transparent_58%),radial-gradient(ellipse_80%_60%_at_0%_90%,rgba(34,211,238,0.18),transparent_55%),linear-gradient(180deg,#0c1222_0%,#030712_55%,#020617_100%)]`}
          />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-slate-900/90 ring-1 ring-cyan-500/25" />
        </div>
      );
    case "oled":
      return (
        <div className={`${base} border-zinc-800 bg-black`}>
          <div className={`${inner} bg-[linear-gradient(180deg,#0a0a0a_0%,#000_100%)]`} />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-zinc-950 ring-1 ring-white/15" />
        </div>
      );
    case "light":
      return (
        <div className={`${base} border-zinc-200/90 bg-white`}>
          <div className={`${inner} bg-gradient-to-b from-neutral-50 to-zinc-100`} />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-white shadow-sm ring-1 ring-zinc-200/70" />
        </div>
      );
    case "evening":
      return (
        <div className={`${base} border-slate-700/80 bg-[#0f172a]`}>
          <div className={`${inner} bg-gradient-to-b from-slate-800 via-[#0f172a] to-slate-950`} />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-slate-800/90 ring-1 ring-slate-600/50" />
        </div>
      );
    case "night":
      return (
        <div className={`${base} border-zinc-800 bg-[#09090b]`}>
          <div className={`${inner} bg-gradient-to-b from-zinc-900 to-black`} />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-zinc-800/95 ring-1 ring-zinc-700/60" />
        </div>
      );
    case "dark":
      return (
        <div className={`${base} border-neutral-800 bg-neutral-950`}>
          <div className={`${inner} bg-[#0a0a0a]`} />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-neutral-900 ring-1 ring-neutral-700/70" />
        </div>
      );
    case "classic":
      return (
        <div className={`${base} border-violet-500/25 bg-black`}>
          <div
            className={`${inner} bg-[radial-gradient(ellipse_120%_90%_at_0%_0%,rgba(217,249,157,0.45),transparent_52%),radial-gradient(ellipse_100%_85%_at_100%_0%,rgba(139,92,246,0.42),transparent_54%),linear-gradient(180deg,#050508_0%,#000_100%)]`}
          />
          <div className="absolute bottom-1 left-1 right-1 h-3 rounded bg-zinc-900/85 ring-1 ring-white/10" />
        </div>
      );
    default:
      return <div className={`${base} bg-zinc-800`} />;
  }
}

export default function WorkspaceThemeSection() {
  const exp = useWorkspaceExperience();
  const tick = useAlignedMinuteTick();
  const live = useMemo(() => resolveWorkspaceTheme(exp.prefs, tick), [exp.prefs, tick]);
  const selected = exp.prefs.appearanceTheme ?? "auto";

  return (
    <section
      id="appearance"
      className="mb-8 scroll-mt-24 rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/95 p-5 shadow-[0_20px_56px_-32px_rgba(99,102,241,0.14)] backdrop-blur-md sm:p-6"
      aria-labelledby="workspace-theme-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--workspace-muted-fg)]">
            Appearance
          </p>
          <h2
            id="workspace-theme-heading"
            className="mt-1 text-[clamp(1.1rem,2.6vw,1.35rem)] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]"
          >
            Workspace theme
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
            Pick a look for the signed-in workspace. Contrast and borders stay readable in every mode.{" "}
            <span className="text-[var(--workspace-fg)]">
              Auto
            </span>{" "}
            uses your{" "}
            <Link
              href="/settings#workspace-prefs"
              className="font-medium text-[var(--workspace-accent)] hover:underline"
            >
              workspace timezone
            </Link>{" "}
            ({WORKSPACE_THEME_AUTO_DESCRIPTION.toLowerCase()}).
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {WORKSPACE_THEME_IDS.map((id) => {
          const isAuto = id === "auto";
          const active = selected === id;
          const resolvedNow = live.resolvedId;

          return (
            <button
              key={id}
              type="button"
              onClick={() => exp.setPrefs({ appearanceTheme: id })}
              className={`group flex flex-col overflow-hidden rounded-xl border text-left transition ${
                active
                  ? "border-[var(--workspace-accent)]/50 bg-[var(--workspace-canvas)]/80 ring-2 ring-[var(--workspace-accent)]/20"
                  : "border-[var(--workspace-border)]/80 bg-[var(--workspace-canvas)]/40 hover:border-[var(--workspace-border)]"
              }`}
            >
              <div className="p-2 pb-0">
                {isAuto ? (
                  <div className="relative h-14 w-full overflow-hidden rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]">
                    <div
                      className="absolute inset-0 bg-[linear-gradient(110deg,#000000_0%,#0c1220_8%,#ecfdf5_18%,#f5f5f4_28%,#fff1f2_38%,#fffbeb_48%,#e0f2fe_58%,#e9d5ff_68%,#ffedd5_78%,#0f172a_88%,#020617_100%)]"
                      aria-hidden
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wider text-zinc-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
                      Auto
                    </div>
                  </div>
                ) : (
                  <ThemePreviewSwatch id={id} />
                )}
              </div>
              <div className="p-3 pt-2">
                <p className="text-[13px] font-semibold text-[var(--workspace-fg)]">
                  {WORKSPACE_THEME_OPTION_LABELS[id]}
                </p>
                <p className="mt-0.5 line-clamp-3 text-[11px] leading-snug text-[var(--workspace-muted-fg)]">
                  {isAuto ? WORKSPACE_THEME_AUTO_DESCRIPTION : WORKSPACE_THEME_DESCRIPTIONS[id]}
                </p>
                {isAuto ? (
                  <p className="mt-1 text-[10px] font-medium text-[var(--workspace-accent)]">
                    Now: {WORKSPACE_THEME_OPTION_LABELS[resolvedNow]}
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
