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
  WORKSPACE_THEME_PHOTO_VARIANTS,
  pickWorkspaceThemePhoto,
  workspacePhotoUrl,
  type WorkspacePhotoSpec,
} from "@/lib/workspace-theme-photos";
import type { WorkspacePrefsV1 } from "@/lib/workspace-prefs";

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function HeroBackdropPicker({
  prefs,
  resolvedThemeId,
  setPrefs,
}: {
  prefs: WorkspacePrefsV1;
  resolvedThemeId: Exclude<WorkspaceThemeId, "auto">;
  setPrefs: (patch: Partial<WorkspacePrefsV1>) => void;
}) {
  const pool =
    WORKSPACE_THEME_PHOTO_VARIANTS[resolvedThemeId] ?? WORKSPACE_THEME_PHOTO_VARIANTS.classic;
  const ctl = prefs.workspaceHeroPhotoSource;
  const activeMode = !ctl || ctl.kind === "daily" ? "daily" : ctl.kind;

  const chip = (on: boolean) =>
    `rounded-xl border px-3 py-2 text-[12px] font-semibold transition ${
      on
        ? "border-[var(--workspace-accent)]/45 bg-[var(--workspace-accent)]/12 text-[var(--workspace-fg)] ring-2 ring-[var(--workspace-accent)]/18"
        : "border-[var(--workspace-border)] bg-[var(--workspace-surface)]/60 text-[var(--workspace-fg)] hover:border-[var(--workspace-border)]"
    }`;

  function onUploadFile(f: File | undefined) {
    if (!f || !f.type.startsWith("image/")) return;
    if (f.size > 380_000) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return;
      setPrefs({
        workspaceCanvasBackground: "photo",
        workspaceHeroPhotoSource: { kind: "upload", dataUrl },
      });
    };
    reader.readAsDataURL(f);
  }

  return (
    <div className="mt-5 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/45 p-4 sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--workspace-muted-fg)]">
        Photography source
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
        Use the daily curated rotation, pin one of the shots below to match your theme, or upload your own image (about
        350&nbsp;KB or smaller keeps sync fast).
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setPrefs({ workspaceCanvasBackground: "photo", workspaceHeroPhotoSource: { kind: "daily" } })
          }
          className={chip(activeMode === "daily")}
        >
          Daily rotation
        </button>
        <label className={`${chip(activeMode === "upload")} inline-flex cursor-pointer items-center gap-2`}>
          <span>Upload</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => onUploadFile(e.target.files?.[0])}
          />
        </label>
        {ctl?.kind === "upload" ? (
          <button
            type="button"
            onClick={() => setPrefs({ workspaceHeroPhotoSource: { kind: "daily" } })}
            className="rounded-xl border border-[var(--workspace-border)] px-3 py-2 text-[12px] font-semibold text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-nav-hover)]"
          >
            Clear upload
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {pool.slice(0, 12).map((spec: WorkspacePhotoSpec) => {
          const chosen = ctl?.kind === "preset" && ctl.path === spec.path;
          return (
            <button
              key={spec.path}
              type="button"
              onClick={() =>
                setPrefs({
                  workspaceCanvasBackground: "photo",
                  workspaceHeroPhotoSource: { kind: "preset", path: spec.path },
                })
              }
              className={`group relative overflow-hidden rounded-xl border text-left transition ${
                chosen
                  ? "border-[var(--workspace-accent)]/55 ring-2 ring-[var(--workspace-accent)]/25"
                  : "border-[var(--workspace-border)] hover:border-[color-mix(in_srgb,var(--workspace-accent)_35%,var(--workspace-border))]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={workspacePhotoUrl(spec.path, 360)}
                alt=""
                className="h-[4.5rem] w-full object-cover"
                loading="lazy"
              />
              <span className="block bg-[color-mix(in_srgb,var(--workspace-surface)_92%,black)] px-2 py-1.5 text-[10px] font-semibold leading-snug text-[var(--workspace-fg)]">
                {spec.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ThemePreviewSwatch({ id, tick }: { id: Exclude<WorkspaceThemeId, "auto">; tick: number }) {
  const pool = WORKSPACE_THEME_PHOTO_VARIANTS[id];
  const specs = useMemo(() => {
    const fallback = [pickWorkspaceThemePhoto(id, new Date())];
    const source = pool.length > 0 ? pool : fallback;
    const seed = hashSeed(`${id}:${Math.floor(tick / 300000)}`);
    return [0, 1, 2].map((offset) => source[(seed + offset) % source.length]);
  }, [id, pool, tick]);
  const remote = specs.map((spec) => workspacePhotoUrl(spec.path, 420));
  const [srcList, setSrcList] = useState(remote);

  useEffect(() => {
    setSrcList(remote);
  }, [remote]);

  const base =
    "relative h-14 w-full overflow-hidden rounded-lg border border-black/10 shadow-inner dark:border-white/15";
  return (
    <div className={base}>
      <div className="absolute inset-0 grid grid-cols-3">
        {srcList.map((src, idx) => (
          <div key={idx} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              onError={() =>
                setSrcList((prev) => prev.map((item, pIdx) => (pIdx === idx ? PHOTO_FALLBACK_PUBLIC : item)))
              }
            />
          </div>
        ))}
      </div>
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          backgroundImage: specs[0]?.scrim,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.92,
        }}
      />
    </div>
  );
}

function GradientPreviewSwatch({ id }: { id: Exclude<WorkspaceThemeId, "auto"> }) {
  const gradients: Partial<Record<Exclude<WorkspaceThemeId, "auto">, string>> = {
    classic: "linear-gradient(135deg,#e9d5ff,#c4b5fd,#a3e635)",
    sunrise: "linear-gradient(135deg,#fef3c7,#fde68a,#f5d0fe)",
    morning: "linear-gradient(135deg,#fff7ed,#fde68a,#f8fafc)",
    daytime: "linear-gradient(135deg,#f5f3ff,#e9d5ff,#dbeafe)",
    ocean: "linear-gradient(135deg,#bae6fd,#67e8f9,#c4b5fd)",
    sunset: "linear-gradient(135deg,#fde68a,#fb7185,#c4b5fd)",
    ember: "linear-gradient(135deg,#fecaca,#fb7185,#7c3aed)",
    lagunabeach: "linear-gradient(135deg,#99f6e4,#93c5fd,#c4b5fd)",
    sanfrancisco: "linear-gradient(135deg,#cbd5e1,#bfdbfe,#c4b5fd)",
    nevada: "linear-gradient(135deg,#fed7aa,#fdba74,#fcd34d)",
    mumbai: "linear-gradient(135deg,#ffedd5,#fdba74,#f59e0b)",
    columbia: "linear-gradient(135deg,#fef3c7,#d6d3d1,#86efac)",
    studio: "linear-gradient(135deg,#f5f5f4,#e7e5e4,#ddd6fe)",
    forest: "linear-gradient(135deg,#dcfce7,#86efac,#bbf7d0)",
    vegas: "linear-gradient(135deg,#1e1b4b,#7c3aed,#ec4899)",
    nyc: "linear-gradient(135deg,#0f172a,#334155,#6366f1)",
    cosmic: "linear-gradient(135deg,#020617,#0f172a,#0e7490)",
    oled: "linear-gradient(135deg,#020617,#000000,#111827)",
    evening: "linear-gradient(135deg,#0f172a,#1e293b,#334155)",
    night: "linear-gradient(135deg,#111827,#0f172a,#1f2937)",
    dark: "linear-gradient(135deg,#0f172a,#111827,#000000)",
    light: "linear-gradient(135deg,#f8fafc,#e2e8f0,#ede9fe)",
  };
  const bg = gradients[id] ?? gradients.classic!;
  return (
    <div className="relative h-14 w-full overflow-hidden rounded-lg border border-black/10 shadow-inner dark:border-white/15">
      <div className="absolute inset-0" style={{ backgroundImage: bg }} />
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
          <span className="font-medium text-[var(--workspace-fg)]">Color &amp; mesh</span> uses each theme&apos;s
          gradient blend on the workspace shell.{" "}
          <span className="font-medium text-[var(--workspace-fg)]">Photography</span> swaps in curated Unsplash-style
          imagery with a readable overlay — the welcome hero follows the same choice when you use the atmospheric style.
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
              Unsplash-style photos plus overlay; matches the welcome hero when atmospheric + photo is on.
            </span>
          </button>
        </div>

        {canvasBg === "photo" ? (
          <HeroBackdropPicker
            prefs={exp.prefs}
            resolvedThemeId={live.resolvedId}
            setPrefs={exp.setPrefs}
          />
        ) : null}
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
                  canvasBg === "photo" ? <ThemePreviewSwatch id={id} tick={tick} /> : <GradientPreviewSwatch id={id} />
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
