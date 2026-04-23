"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type OverviewHeroPeriod,
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
};

export default function OverviewTimeOfDayArt({ period, mode, rotationIndex, regionKey }: Props) {
  const spec = useMemo(
    () => resolveOverviewHeroPhotoSpec(period, regionKey, rotationIndex),
    [period, regionKey, rotationIndex]
  );
  const remote = workspacePhotoUrl(spec.path, 1600);
  const [src, setSrc] = useState(remote);

  useEffect(() => {
    setSrc(remote);
  }, [remote]);

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

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        decoding="async"
        onError={() => setSrc(PHOTO_FALLBACK_PUBLIC)}
      />
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          backgroundImage: overviewHeroReadableImageStack(period, spec),
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <p className="sr-only">{spec.label}</p>
    </div>
  );
}
