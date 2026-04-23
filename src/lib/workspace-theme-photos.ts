/**
 * Real-world photography for workspace backgrounds (Unsplash CDN).
 * Each theme uses a location- or mood-matched image plus a scrim so tokens stay readable.
 */

import type { CSSProperties } from "react";
import type { WorkspaceThemeId } from "@/lib/workspace-themes";

/** Matches `OverviewDayPeriod` on the overview hero (avoid importing UI here). */
export type OverviewHeroPeriod = "morning" | "afternoon" | "evening" | "night";

/** Customize → Auto tile: one representative coastal panorama (same family as rotating Auto themes). */
export const WORKSPACE_THEME_AUTO_PREVIEW_PATH = "photo-1500534314209-a25ddb2bd429";

/** Width-optimized URL for large surfaces (Desk hero, Overview). */
export function workspacePhotoUrl(path: string, width: number): string {
  return `https://images.unsplash.com/${path}?auto=format&fit=crop&w=${width}&q=82`;
}

export type WorkspacePhotoSpec = {
  path: string;
  /** CSS `background-position` */
  position: string;
  /** Top layer(s) over the photo: linear-gradient / color stops for text contrast */
  scrim: string;
  /** When the image is still loading or fails */
  fallback: string;
  /** Accessible description for screen readers / captions */
  label: string;
};

function spec(
  path: string,
  label: string,
  position: string,
  scrim: string,
  fallback: string
): WorkspacePhotoSpec {
  return { path, label, position, scrim, fallback };
}

/** Light shell: heavy top-left wash so dark text stays legible. */
const SCRIM_LIGHT =
  "linear-gradient(135deg,rgba(255,255,255,0.92)0%,rgba(255,255,255,0.55)38%,rgba(255,255,255,0.22)72%,rgba(248,250,252,0.35)100%)";

/** Dark shell: lift text (light fg) with top + bottom vignette. */
const SCRIM_DARK =
  "linear-gradient(180deg,rgba(2,6,23,0.75)0%,rgba(15,23,42,0.35)42%,rgba(2,6,23,0.82)100%)";

const SCRIM_DARK_WARM =
  "linear-gradient(185deg,rgba(15,5,28,0.78)0%,rgba(26,10,46,0.4)45%,rgba(10,8,18,0.88)100%)";

const SCRIM_NIGHT_CITY =
  "linear-gradient(180deg,rgba(2,8,23,0.82)0%,rgba(15,23,42,0.38)48%,rgba(2,6,23,0.92)100%)";

/**
 * Full-bleed workspace canvas photos — keyed by resolved theme id (`auto` uses resolved, not listed here).
 * Paths are Unsplash photo paths (slug after images.unsplash.com/).
 */
export const WORKSPACE_THEME_PHOTO: Record<
  Exclude<WorkspaceThemeId, "auto">,
  WorkspacePhotoSpec
> = {
  sunrise: spec(
    "photo-1470252649378-9c29740cd9b1",
    "Sunrise over mountains",
    "center top",
    SCRIM_LIGHT,
    "#fff7ed"
  ),
  morning: spec(
    "photo-1495616811223-4d98c6e9c869",
    "California hills at dawn",
    "center",
    SCRIM_LIGHT,
    "#fffbeb"
  ),
  daytime: spec(
    "photo-1507525428034-b723cf961d3e",
    "California coast — bright Pacific daylight",
    "center",
    SCRIM_LIGHT,
    "#f8fafc"
  ),
  sunset: spec(
    "photo-1506905925346-21bda4d32df4",
    "Mountain sunset",
    "center",
    `${SCRIM_LIGHT},linear-gradient(180deg,rgba(251,146,60,0.12),transparent 40%)`,
    "#fff7ed"
  ),
  ember: spec(
    "photo-1518837695005-2084693f58b8",
    "Ocean sunset after golden hour",
    "center",
    "linear-gradient(185deg,rgba(255,247,237,0.88)0%,rgba(254,215,170,0.35)50%,rgba(76,29,149,0.45)100%)",
    "#fdf4ff"
  ),
  ocean: spec(
    "photo-1439405326854-014607f0d800",
    "Open ocean from above",
    "center",
    SCRIM_LIGHT,
    "#ecfeff"
  ),
  lagunabeach: spec(
    "photo-1559827260-dc66d52befbc",
    "Pacific coast — Laguna Beach area",
    "center bottom",
    SCRIM_LIGHT,
    "#ecfdf5"
  ),
  sanfrancisco: spec(
    "photo-1501594907352-04cda38ebc29",
    "San Francisco — Golden Gate and bay",
    "center 35%",
    SCRIM_LIGHT,
    "#eef2ff"
  ),
  nevada: spec(
    "photo-1509316785289-025f5cd9467c",
    "Mojave desert — Joshua trees",
    "center",
    SCRIM_LIGHT,
    "#fef3c7"
  ),
  mumbai: spec(
    "photo-1567157577867-3cdb31681ccb",
    "Mumbai — Gateway and waterfront",
    "center",
    SCRIM_LIGHT,
    "#fffbeb"
  ),
  columbia: spec(
    "photo-1523050854058-8df90110c9f1",
    "University campus — ivy and columns",
    "center",
    SCRIM_LIGHT,
    "#faf7f2"
  ),
  studio: spec(
    "photo-1497366216548-37526070297c",
    "Bright workspace interior with window light",
    "center",
    "linear-gradient(135deg,rgba(255,255,255,0.94)0%,rgba(250,250,249,0.5)55%,rgba(231,229,228,0.35)100%)",
    "#fafaf9"
  ),
  forest: spec(
    "photo-1549880338-826d17d7e8c9",
    "Wasatch range — Utah mountain peaks",
    "center top",
    SCRIM_LIGHT,
    "#f0fdf4"
  ),
  pink: spec(
    "photo-1522383225653-ed111181a951",
    "Cherry blossoms in spring",
    "center",
    `${SCRIM_LIGHT},linear-gradient(180deg,rgba(253,164,175,0.18),transparent 55%)`,
    "#fdf2f8"
  ),
  cosmic: spec(
    "photo-1531366936337-7cbe31aba9c1",
    "Aurora over a cold night landscape",
    "center",
    SCRIM_DARK,
    "#0c1222"
  ),
  vegas: spec(
    "photo-1605833556294-ea5c71418840",
    "Las Vegas Strip at night",
    "center 70%",
    SCRIM_DARK_WARM,
    "#1a0a2e"
  ),
  nyc: spec(
    "photo-1496442226666-8d4d0e62e6e9",
    "New York City — classic skyline view",
    "center 35%",
    SCRIM_NIGHT_CITY,
    "#0f172a"
  ),
  oled: spec(
    "photo-1419242902214-272b3f66ee7a",
    "Night sky with stars",
    "center",
    "linear-gradient(180deg,rgba(0,0,0,0.25)0%,rgba(0,0,0,0.92)100%)",
    "#000000"
  ),
  evening: spec(
    "photo-1519501025264-65ba15a82390",
    "City lights at blue hour",
    "center",
    SCRIM_NIGHT_CITY,
    "#0f172a"
  ),
  night: spec(
    "photo-1502134249126-9f3759251120",
    "Coastal night — calm water and lights",
    "center bottom",
    SCRIM_NIGHT_CITY,
    "#09090b"
  ),
  light: spec(
    "photo-1497366216548-37526070297c",
    "Minimal interior daylight",
    "center",
    "linear-gradient(135deg,rgba(255,255,255,0.96)0%,rgba(250,250,249,0.55)100%)",
    "#fafafa"
  ),
  dark: spec(
    "photo-1473448911188-480fe07ca1b8",
    "Forest trail — deep shade",
    "center",
    "linear-gradient(180deg,rgba(9,9,11,0.72)0%,rgba(9,9,11,0.55)50%,rgba(0,0,0,0.88)100%)",
    "#0a0a0a"
  ),
  classic: spec(
    "photo-1500534314209-a25ddb2bd429",
    "California coast — waves and cliffs",
    "center",
    `${SCRIM_DARK},radial-gradient(ellipse 80% 60% at 10% 0%,rgba(217,249,157,0.18),transparent 55%),radial-gradient(ellipse 70% 55% at 95% 10%,rgba(139,92,246,0.16),transparent 52%)`,
    "#050508"
  ),
};

/** Overview hero on `/overview` — time-of-day photos (real places). */
export const OVERVIEW_HERO_PHOTO: Record<OverviewHeroPeriod, WorkspacePhotoSpec> = {
  morning: spec(
    "photo-1470252649378-9c29740cd9b1",
    "Sunrise — western USA mountains",
    "center top",
    SCRIM_LIGHT,
    "#fffbeb"
  ),
  afternoon: spec(
    "photo-1506905925346-21bda4d32df4",
    "High Sierra — alpine afternoon light",
    "center",
    SCRIM_LIGHT,
    "#e0f2fe"
  ),
  evening: spec(
    "photo-1500534314209-a25ddb2bd429",
    "California coast at golden hour",
    "center",
    `${SCRIM_LIGHT},linear-gradient(90deg,rgba(255,255,255,0.88),rgba(255,255,255,0.25))`,
    "#faf5ff"
  ),
  night: spec(
    "photo-1549880338-826d17d7e8c9",
    "Wasatch mountains under night sky — Salt Lake City region",
    "center top",
    `${SCRIM_NIGHT_CITY},linear-gradient(90deg,rgba(15,23,42,0.92),rgba(15,23,42,0.35))`,
    "#0f172a"
  ),
};

export function workspaceThemePhotoStyle(
  resolved: Exclude<WorkspaceThemeId, "auto">
): CSSProperties {
  const p = WORKSPACE_THEME_PHOTO[resolved];
  const url = workspacePhotoUrl(p.path, 1920);
  return {
    backgroundColor: p.fallback,
    backgroundImage: `${p.scrim}, url(${url})`,
    backgroundSize: "cover",
    backgroundPosition: p.position,
    backgroundRepeat: "no-repeat",
  };
}
