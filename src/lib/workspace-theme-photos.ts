/**
 * Real-world photography (Unsplash). Every `path` is checked to return HTTP 200
 * from images.unsplash.com (see project maintenance / curl verification).
 * `PHOTO_FALLBACK_PUBLIC` is a local asset for onError / broken CDN.
 */

import type { CSSProperties } from "react";
import type { WorkspaceThemeId } from "@/lib/workspace-themes";

export type OverviewHeroPeriod = "morning" | "afternoon" | "evening" | "night";

/** Local JPEG if Unsplash fails (copy of marketing hero or any 1920w photo). */
export const PHOTO_FALLBACK_PUBLIC = "/images/workspace/photo-fallback.jpg";

export const WORKSPACE_THEME_AUTO_PREVIEW_PATH = "photo-1500534314209-a25ddb2bd429";

export function workspacePhotoUrl(path: string, width: number): string {
  const clean = path.replace(/^\//, "");
  return `https://images.unsplash.com/${clean}?ixlib=rb-4.1.0&auto=format&fit=crop&w=${width}&q=82&fm=jpg`;
}

export type WorkspacePhotoSpec = {
  path: string;
  position: string;
  scrim: string;
  fallback: string;
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

const SCRIM_LIGHT =
  "linear-gradient(135deg,rgba(255,255,255,0.92)0%,rgba(255,255,255,0.55)38%,rgba(255,255,255,0.22)72%,rgba(248,250,252,0.35)100%)";

const SCRIM_DARK =
  "linear-gradient(180deg,rgba(2,6,23,0.75)0%,rgba(15,23,42,0.35)42%,rgba(2,6,23,0.82)100%)";

const SCRIM_DARK_WARM =
  "linear-gradient(185deg,rgba(15,5,28,0.78)0%,rgba(26,10,46,0.4)45%,rgba(10,8,18,0.88)100%)";

const SCRIM_NIGHT_CITY =
  "linear-gradient(180deg,rgba(2,8,23,0.82)0%,rgba(15,23,42,0.38)48%,rgba(2,6,23,0.92)100%)";

/**
 * Verified Unsplash IDs (HTTP 200). Each theme gets a distinct image where possible.
 * SF theme uses Golden Gate only; daytime uses a different coastal shot.
 */
export const WORKSPACE_THEME_PHOTO: Record<
  Exclude<WorkspaceThemeId, "auto">,
  WorkspacePhotoSpec
> = {
  sunrise: spec(
    "photo-1472214103451-9374bd1c798e",
    "Sunrise over hills",
    "center top",
    SCRIM_LIGHT,
    "#fff7ed"
  ),
  morning: spec(
    "photo-1495616811223-4d98c6e9c869",
    "Misty mountain morning",
    "center",
    SCRIM_LIGHT,
    "#fffbeb"
  ),
  daytime: spec(
    "photo-1507525428034-b723cf961d3e",
    "Seaside — bright daylight",
    "center",
    SCRIM_LIGHT,
    "#f8fafc"
  ),
  sunset: spec(
    "photo-1469474968028-56623f02e42e",
    "Golden lake and peaks",
    "center",
    `${SCRIM_LIGHT},linear-gradient(180deg,rgba(251,146,60,0.14),transparent 42%)`,
    "#fff7ed"
  ),
  ember: spec(
    "photo-1506905925346-21bda4d32df4",
    "Alpine ridges — warm dusk tint",
    "center",
    "linear-gradient(185deg,rgba(255,247,237,0.9)0%,rgba(254,215,170,0.38)52%,rgba(76,29,149,0.42)100%)",
    "#fdf4ff"
  ),
  ocean: spec(
    "photo-1500382017468-9049fed747ef",
    "Open water — sea and sky",
    "center",
    SCRIM_LIGHT,
    "#ecfeff"
  ),
  lagunabeach: spec(
    "photo-1528360983277-13d401cdc186",
    "Pacific palette — coastal vibe",
    "center bottom",
    SCRIM_LIGHT,
    "#ecfdf5"
  ),
  sanfrancisco: spec(
    "photo-1501594907352-04cda38ebc29",
    "San Francisco — Golden Gate Bridge",
    "center 38%",
    SCRIM_LIGHT,
    "#eef2ff"
  ),
  nevada: spec(
    "photo-1682687220742-aba13b6e50ba",
    "High desert trail — warm earth",
    "center",
    SCRIM_LIGHT,
    "#fef3c7"
  ),
  mumbai: spec(
    "photo-1480714378408-67cf0d13bc1b",
    "Dense city rhythm — aerial energy",
    "center",
    SCRIM_LIGHT,
    "#fffbeb"
  ),
  columbia: spec(
    "photo-1579621970563-ebec7560ff3e",
    "Campus café — warm study tone",
    "center",
    SCRIM_LIGHT,
    "#faf7f2"
  ),
  studio: spec(
    "photo-1497366216548-37526070297c",
    "Bright desk by the window",
    "center",
    "linear-gradient(135deg,rgba(255,255,255,0.94)0%,rgba(250,250,249,0.5)55%,rgba(231,229,228,0.35)100%)",
    "#fafaf9"
  ),
  forest: spec(
    "photo-1464822759023-fed622ff2c3b",
    "Alpine lake and forest",
    "center",
    SCRIM_LIGHT,
    "#f0fdf4"
  ),
  pink: spec(
    "photo-1522383225653-ed111181a951",
    "Cherry blossoms",
    "center",
    `${SCRIM_LIGHT},linear-gradient(180deg,rgba(253,164,175,0.18),transparent 55%)`,
    "#fdf2f8"
  ),
  cosmic: spec(
    "photo-1514525253161-7a46d19cd819",
    "Night city glow — aurora mood",
    "center",
    SCRIM_DARK,
    "#0c1222"
  ),
  vegas: spec(
    "photo-1519681393784-d120267933ba",
    "Desert night sky — neon-ready contrast",
    "center 65%",
    SCRIM_DARK_WARM,
    "#1a0a2e"
  ),
  nyc: spec(
    "photo-1496442226666-8d4d0e62e6e9",
    "New York City skyline",
    "center 38%",
    SCRIM_NIGHT_CITY,
    "#0f172a"
  ),
  oled: spec(
    "photo-1419242902214-272b3f66ee7a",
    "Deep night sky — stars",
    "center",
    "linear-gradient(180deg,rgba(0,0,0,0.3)0%,rgba(0,0,0,0.94)100%)",
    "#000000"
  ),
  evening: spec(
    "photo-1519501025264-65ba15a82390",
    "City lights — evening chrome",
    "center",
    SCRIM_NIGHT_CITY,
    "#0f172a"
  ),
  night: spec(
    "photo-1500534314209-a25ddb2bd429",
    "Pacific coast at blue hour",
    "center bottom",
    SCRIM_NIGHT_CITY,
    "#09090b"
  ),
  light: spec(
    "photo-1504674900247-0877df9cc836",
    "Warm table — soft daylight interior",
    "center",
    "linear-gradient(135deg,rgba(255,255,255,0.96)0%,rgba(250,250,249,0.55)100%)",
    "#fafafa"
  ),
  dark: spec(
    "photo-1579621970563-ebec7560ff3e",
    "Low-light interior contrast",
    "center",
    "linear-gradient(180deg,rgba(9,9,11,0.72)0%,rgba(9,9,11,0.55)50%,rgba(0,0,0,0.88)100%)",
    "#0a0a0a"
  ),
  classic: spec(
    "photo-1469474968028-56623f02e42e",
    "Scenic horizon — signature calm",
    "center",
    `${SCRIM_DARK},radial-gradient(ellipse 80% 60% at 10% 0%,rgba(217,249,157,0.18),transparent 55%),radial-gradient(ellipse 70% 55% at 95% 10%,rgba(139,92,246,0.16),transparent 52%)`,
    "#050508"
  ),
};

/** Rotating pools — same mood per theme, different shots by calendar day. */
const ALL_THEME_PHOTOS_UNIQUE = Object.values(WORKSPACE_THEME_PHOTO).reduce<WorkspacePhotoSpec[]>(
  (acc, item) => {
    if (!acc.some((existing) => existing.path === item.path)) acc.push(item);
    return acc;
  },
  []
);

function buildVariantPool(
  key: Exclude<WorkspaceThemeId, "auto">,
  anchors: Exclude<WorkspaceThemeId, "auto">[]
): WorkspacePhotoSpec[] {
  const preferred = [WORKSPACE_THEME_PHOTO[key], ...anchors.map((k) => WORKSPACE_THEME_PHOTO[k])];
  const uniquePreferred = preferred.filter(
    (item, idx) => preferred.findIndex((x) => x.path === item.path) === idx
  );
  const rest = ALL_THEME_PHOTOS_UNIQUE.filter(
    (item) => !uniquePreferred.some((preferredItem) => preferredItem.path === item.path)
  );
  return [...uniquePreferred, ...rest].slice(0, 12);
}

export const WORKSPACE_THEME_PHOTO_VARIANTS: Record<
  Exclude<WorkspaceThemeId, "auto">,
  WorkspacePhotoSpec[]
> = {
  sunrise: buildVariantPool("sunrise", ["morning", "sunset", "daytime"]),
  morning: buildVariantPool("morning", ["sunrise", "forest", "studio"]),
  daytime: buildVariantPool("daytime", ["ocean", "light", "studio"]),
  sunset: buildVariantPool("sunset", ["ember", "evening", "night"]),
  ember: buildVariantPool("ember", ["sunset", "evening", "classic"]),
  ocean: buildVariantPool("ocean", ["lagunabeach", "daytime", "forest"]),
  lagunabeach: buildVariantPool("lagunabeach", ["ocean", "sunset", "daytime"]),
  sanfrancisco: buildVariantPool("sanfrancisco", ["daytime", "studio", "morning"]),
  nevada: buildVariantPool("nevada", ["sunset", "ember", "daytime"]),
  mumbai: buildVariantPool("mumbai", ["daytime", "studio", "night"]),
  columbia: buildVariantPool("columbia", ["studio", "morning", "light"]),
  studio: buildVariantPool("studio", ["light", "daytime", "morning"]),
  forest: buildVariantPool("forest", ["morning", "ocean", "daytime"]),
  pink: buildVariantPool("pink", ["sunset", "lagunabeach", "light"]),
  cosmic: buildVariantPool("cosmic", ["nyc", "vegas", "night"]),
  vegas: buildVariantPool("vegas", ["evening", "cosmic", "nyc"]),
  nyc: buildVariantPool("nyc", ["evening", "cosmic", "vegas"]),
  oled: buildVariantPool("oled", ["night", "cosmic", "dark"]),
  evening: buildVariantPool("evening", ["nyc", "vegas", "cosmic"]),
  night: buildVariantPool("night", ["cosmic", "oled", "evening"]),
  light: buildVariantPool("light", ["studio", "daytime", "morning"]),
  dark: buildVariantPool("dark", ["oled", "night", "cosmic"]),
  classic: buildVariantPool("classic", ["cosmic", "night", "sunset"]),
};

/** Stable index per local calendar day so photography rotates daily but stays consistent intraday. */
export function dailyPhotoPoolIndex(themeKey: string, poolLength: number, date = new Date()): number {
  if (poolLength <= 1) return 0;
  const day = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let h = 2166136261;
  const s = `${themeKey}:${day}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % poolLength;
}

export function pickWorkspaceThemePhoto(
  id: Exclude<WorkspaceThemeId, "auto">,
  date = new Date()
): WorkspacePhotoSpec {
  const pool = WORKSPACE_THEME_PHOTO_VARIANTS[id];
  const list = pool?.length ? pool : [WORKSPACE_THEME_PHOTO[id]];
  const idx = dailyPhotoPoolIndex(id, list.length, date);
  return list[idx] ?? WORKSPACE_THEME_PHOTO[id];
}

export const OVERVIEW_HERO_PHOTO: Record<OverviewHeroPeriod, WorkspacePhotoSpec> = {
  morning: spec(
    "photo-1472214103451-9374bd1c798e",
    "Sunrise hills",
    "center top",
    SCRIM_LIGHT,
    "#fffbeb"
  ),
  afternoon: spec(
    "photo-1506905925346-21bda4d32df4",
    "Alpine afternoon",
    "center",
    SCRIM_LIGHT,
    "#e0f2fe"
  ),
  evening: spec(
    "photo-1519501025264-65ba15a82390",
    "City evening — warm glass and light",
    "center",
    `${SCRIM_LIGHT},linear-gradient(90deg,rgba(255,255,255,0.88),rgba(255,255,255,0.28))`,
    "#faf5ff"
  ),
  night: spec(
    "photo-1464822759023-fed622ff2c3b",
    "Mountain night calm",
    "center top",
    `${SCRIM_NIGHT_CITY},linear-gradient(90deg,rgba(15,23,42,0.92),rgba(15,23,42,0.38))`,
    "#0f172a"
  ),
};

/** Las Vegas / coast / SF — tap location on Overview to cycle curated sets (photo mode). */
const HERO_POOL_VEGAS = [
  WORKSPACE_THEME_PHOTO.vegas,
  WORKSPACE_THEME_PHOTO.nyc,
  WORKSPACE_THEME_PHOTO.evening,
] as const;

const HERO_POOL_LAGUNA = [
  WORKSPACE_THEME_PHOTO.lagunabeach,
  WORKSPACE_THEME_PHOTO.ocean,
  WORKSPACE_THEME_PHOTO.daytime,
] as const;

const HERO_POOL_SF = [
  WORKSPACE_THEME_PHOTO.sanfrancisco,
  WORKSPACE_THEME_PHOTO.studio,
  WORKSPACE_THEME_PHOTO.morning,
] as const;

const HERO_POOL_SOCAL = [
  WORKSPACE_THEME_PHOTO.lagunabeach,
  WORKSPACE_THEME_PHOTO.sunset,
  WORKSPACE_THEME_PHOTO.daytime,
] as const;

const HERO_BY_PERIOD: Record<OverviewHeroPeriod, WorkspacePhotoSpec[]> = {
  morning: [
    WORKSPACE_THEME_PHOTO.sunrise,
    WORKSPACE_THEME_PHOTO.morning,
    WORKSPACE_THEME_PHOTO.forest,
  ],
  afternoon: [
    WORKSPACE_THEME_PHOTO.daytime,
    WORKSPACE_THEME_PHOTO.ocean,
    WORKSPACE_THEME_PHOTO.studio,
  ],
  evening: [
    WORKSPACE_THEME_PHOTO.ember,
    WORKSPACE_THEME_PHOTO.sunset,
    WORKSPACE_THEME_PHOTO.evening,
  ],
  night: [
    WORKSPACE_THEME_PHOTO.night,
    WORKSPACE_THEME_PHOTO.cosmic,
    WORKSPACE_THEME_PHOTO.evening,
  ],
};

/** Strong left band so headline stays readable on any photograph. */
function heroReadabilityLayer(period: OverviewHeroPeriod): string {
  if (period === "night") {
    return "linear-gradient(92deg,rgba(15,23,42,0.94) 0%,rgba(15,23,42,0.72) 38%,rgba(15,23,42,0.18) 68%,transparent 92%)";
  }
  if (period === "evening") {
    return "linear-gradient(92deg,rgba(255,255,255,0.97) 0%,rgba(255,251,247,0.78) 38%,rgba(255,255,255,0.28) 72%,rgba(250,245,255,0.06) 100%)";
  }
  return "linear-gradient(92deg,rgba(255,255,255,0.98) 0%,rgba(255,255,255,0.78) 36%,rgba(255,255,255,0.32) 66%,transparent 94%)";
}

export function resolveOverviewHeroPhotoSpec(
  period: OverviewHeroPeriod,
  regionKey: string | undefined,
  rotationIndex: number
): WorkspacePhotoSpec {
  const i = Math.abs(rotationIndex | 0);
  const key = regionKey?.trim();
  if (key === "las_vegas_nv") return HERO_POOL_VEGAS[i % HERO_POOL_VEGAS.length];
  if (key === "laguna_beach_ca") return HERO_POOL_LAGUNA[i % HERO_POOL_LAGUNA.length];
  if (key === "san_francisco_ca") return HERO_POOL_SF[i % HERO_POOL_SF.length];
  if (key === "los_angeles_ca") return HERO_POOL_SOCAL[i % HERO_POOL_SOCAL.length];
  const pool = HERO_BY_PERIOD[period];
  return pool[i % pool.length];
}

/** Full CSS `backgroundImage` stack: readability + theme scrims (no URL — img is separate). */
export function overviewHeroReadableImageStack(
  period: OverviewHeroPeriod,
  photoSpec: WorkspacePhotoSpec
): string {
  return `${heroReadabilityLayer(period)}, ${photoSpec.scrim}`;
}

/**
 * Mesh-only hero when canvas photography is off — Route5 violet + lime family, period-tinted.
 */
export function overviewHeroMeshStyle(
  period: OverviewHeroPeriod,
  variantIndex: number
): CSSProperties {
  const v = variantIndex % 2;
  const lime = "rgba(163,230,53,0.22)";
  const violet = "rgba(139,92,246,0.2)";
  const base =
    period === "morning"
      ? v === 0
        ? "linear-gradient(138deg,#fffbeb 0%,#fef3c7 42%,#eef2ff 100%)"
        : "linear-gradient(145deg,#fff7ed 0%,#ffedd5 48%,#ede9fe 100%)"
      : period === "afternoon"
        ? v === 0
          ? "linear-gradient(145deg,#f8fafc 0%,#e0e7ff 48%,#ecfdf5 100%)"
          : "linear-gradient(155deg,#f1f5f9 0%,#ddd6fe 45%,#d1fae5 100%)"
        : period === "evening"
          ? v === 0
            ? "linear-gradient(155deg,#faf5ff 0%,#ffe4e6 42%,#ede9fe 100%)"
            : "linear-gradient(160deg,#fdf4ff 0%,#fed7aa 38%,#e9d5ff 100%)"
          : v === 0
            ? "linear-gradient(165deg,#0f172a 0%,#1e1b4b 52%,#0c4a6e 100%)"
            : "linear-gradient(168deg,#020617 0%,#312e81 48%,#134e4a 100%)";

  const mesh =
    period === "night"
      ? `radial-gradient(ellipse 90% 70% at 12% -10%,${violet},transparent 58%),radial-gradient(ellipse 70% 55% at 92% 88%,${lime},transparent 52%)`
      : `radial-gradient(ellipse 85% 65% at 10% -8%,${violet},transparent 55%),radial-gradient(ellipse 72% 58% at 94% 8%,${lime},transparent 52%),radial-gradient(ellipse 60% 45% at 50% 110%,rgba(59,130,246,0.12),transparent 55%)`;

  return {
    backgroundColor: period === "night" ? "#0f172a" : "#fafafa",
    backgroundImage: `${mesh}, ${base}`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

export function workspaceThemePhotoStyle(
  resolved: Exclude<WorkspaceThemeId, "auto">
): CSSProperties {
  const p = pickWorkspaceThemePhoto(resolved, new Date());
  const url = workspacePhotoUrl(p.path, 1920);
  return {
    backgroundColor: p.fallback,
    backgroundImage: `${p.scrim}, url("${url}")`,
    backgroundSize: "cover",
    backgroundPosition: p.position,
    backgroundRepeat: "no-repeat",
  };
}
