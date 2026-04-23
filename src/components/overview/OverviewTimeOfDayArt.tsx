"use client";

import {
  OVERVIEW_HERO_PHOTO,
  type OverviewHeroPeriod,
  workspacePhotoUrl,
} from "@/lib/workspace-theme-photos";

type Props = {
  period: OverviewHeroPeriod;
};

export default function OverviewTimeOfDayArt({ period }: Props) {
  const spec = OVERVIEW_HERO_PHOTO[period];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={workspacePhotoUrl(spec.path, 1600)}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        decoding="async"
      />
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          backgroundImage: spec.scrim,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <p className="sr-only">{spec.label}</p>
    </div>
  );
}
