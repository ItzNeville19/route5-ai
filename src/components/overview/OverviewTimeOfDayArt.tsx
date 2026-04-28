"use client";

import { useEffect, useMemo, useState } from "react";
import {
  OVERVIEW_HERO_PHOTO,
  type OverviewHeroPeriod,
  type OverviewHeroReadableTone,
  type WorkspacePhotoSpec,
  PHOTO_FALLBACK_PUBLIC,
  overviewHeroMeshStyle,
  overviewHeroReadableImageStack,
  resolveOverviewHeroPhotoSpec,
  workspacePhotoUrl,
} from "@/lib/workspace-theme-photos";

type CanvasMode = "gradient" | "photo";

type Props = {
  period: OverviewHeroPeriod;
  mode: CanvasMode;
  /** Cycles with location / “wall” control for both mesh and photo sets. */
  rotationIndex: number;
  /** Sub-regions (e.g. `las_vegas_nv`) map to curated photo pools. */
  regionKey?: string;
  /** Align scrim with workspace light palette (`workspace-palette-light`) for slate copy. */
  readableTone?: OverviewHeroReadableTone;
  /** Curated preset selected in Customize (skips random rotation). */
  forcedPhotoSpec?: WorkspacePhotoSpec | null;
  /** User-uploaded background (`data:image/...`). */
  customPhotoUrl?: string | null;
};

export default function OverviewTimeOfDayArt({
  period,
  mode,
  rotationIndex,
  regionKey,
  readableTone = "default",
  forcedPhotoSpec,
  customPhotoUrl,
}: Props) {
  const spec = useMemo(() => {
    if (forcedPhotoSpec) return forcedPhotoSpec;
    return resolveOverviewHeroPhotoSpec(period, regionKey, rotationIndex);
  }, [forcedPhotoSpec, period, regionKey, rotationIndex]);

  const remote = workspacePhotoUrl(spec.path, 1600);
  const [src, setSrc] = useState(customPhotoUrl ?? remote);

  useEffect(() => {
    setSrc(customPhotoUrl ?? remote);
  }, [customPhotoUrl, remote]);

  const meshStyle = useMemo(
    () => overviewHeroMeshStyle(period, rotationIndex),
    [period, rotationIndex]
  );

  if (mode === "gradient") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <div className="absolute inset-0" style={meshStyle} aria-hidden />
        <p className="sr-only">Route5 mesh — {period}</p>
      </div>
    );
  }

  const overlaySpecForReadability = OVERVIEW_HERO_PHOTO[period];

  if (customPhotoUrl) {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={customPhotoUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          decoding="async"
        />
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            backgroundImage: overviewHeroReadableImageStack(period, overlaySpecForReadability, readableTone),
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <p className="sr-only">Custom workspace photo</p>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        decoding="async"
        onError={() => setSrc(PHOTO_FALLBACK_PUBLIC)}
      />
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          backgroundImage: overviewHeroReadableImageStack(period, spec, readableTone),
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <p className="sr-only">{spec.label}</p>
    </div>
  );
}
