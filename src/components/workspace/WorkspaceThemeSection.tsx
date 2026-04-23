"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  PHOTO_FALLBACK_PUBLIC,
  WORKSPACE_THEME_AUTO_PREVIEW_PATH,
  pickWorkspaceThemePhoto,
  workspacePhotoUrl,
} from "@/lib/workspace-theme-photos";

function ThemePreviewSwatch({ id }: { id: Exclude<WorkspaceThemeId, "auto"> }) {
  const spec = pickWorkspaceThemePhoto(id, new Date());
  const remote = workspacePhotoUrl(spec.path, 520);
  const [src, setSrc] = useState(remote);

  useEffect(() => {
    setSrc(remote);
  }, [remote]);

  const base =
    "relative h-14 w-full overflow-hidden rounded-lg border border-black/10 shadow-inner dark:border-white/15";
  return (
    <div className={base}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        onError={() => setSrc(PHOTO_FALLBACK_PUBLIC)}
      />
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          backgroundImage: spec.scrim,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.92,
        }}
      />
    </div>
  );
}

function AutoThemePreviewThumb() {
  const remote = workspacePhotoUrl(WORKSPACE_THEME_AUTO_PREVIEW_PATH, 520);
  const [src, setSrc] = useState(remote);

  useEffect(() => {
    setSrc(remote);
  }, [remote]);

  return (
    <div className="relative h-14 w-full overflow-hidden rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        onError={() => setSrc(PHOTO_FALLBACK_PUBLIC)}
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-black/55 via-white/35 to-slate-900/50"
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
        Auto
      </div>
    </div>
  );
}

export default function WorkspaceThemeSection() {
  const exp = useWorkspaceExperience();
  const tick = useAlignedMinuteTick();
  const live = useMemo(() => resolveWorkspaceTheme(exp.prefs, tick), [exp.prefs, tick]);
  const selected = exp.prefs.appearanceTheme ?? "auto";
  const canvasBg = exp.prefs.workspaceCanvasBackground ?? "gradient";

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

      <div className="mt-6 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted-fg)]">
          Command canvas
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Choose between the original <span className="font-medium text-[var(--workspace-fg)]">color &amp; mesh</span>{" "}
          treatment (signature violet + lime gradients per theme) or layered{" "}
          <span className="font-medium text-[var(--workspace-fg)]">photography</span> from your selected theme — both stay
          WCAG-conscious.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => exp.setPrefs({ workspaceCanvasBackground: "gradient" })}
            className={`rounded-xl border px-4 py-3 text-left text-[13px] font-semibold transition ${
              canvasBg === "gradient"
                ? "border-[var(--workspace-accent)]/45 bg-[var(--workspace-accent)]/10 text-[var(--workspace-fg)] ring-2 ring-[var(--workspace-accent)]/18"
                : "border-[var(--workspace-border)] bg-[var(--workspace-surface)]/60 text-[var(--workspace-fg)] hover:border-[var(--workspace-border)]"
            }`}
          >
            Color &amp; mesh
            <span className="mt-1 block text-[11px] font-normal leading-snug text-[var(--workspace-muted-fg)]">
              Route5 gradients — recommended default for clarity.
            </span>
          </button>
          <button
            type="button"
            onClick={() => exp.setPrefs({ workspaceCanvasBackground: "photo" })}
            className={`rounded-xl border px-4 py-3 text-left text-[13px] font-semibold transition ${
              canvasBg === "photo"
                ? "border-[var(--workspace-accent)]/45 bg-[var(--workspace-accent)]/10 text-[var(--workspace-fg)] ring-2 ring-[var(--workspace-accent)]/18"
                : "border-[var(--workspace-border)] bg-[var(--workspace-surface)]/60 text-[var(--workspace-fg)] hover:border-[var(--workspace-border)]"
            }`}
          >
            Photography
            <span className="mt-1 block text-[11px] font-normal leading-snug text-[var(--workspace-muted-fg)]">
              Curated imagery layered on the canvas (Overview hero follows the same setting).
            </span>
          </button>
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
                  <AutoThemePreviewThumb />
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
