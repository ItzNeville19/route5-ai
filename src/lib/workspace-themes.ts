/**
 * Workspace appearance themes — all use explicit CSS tokens (no white-on-white / dark-on-dark).
 * `auto` follows the hour in `workspaceTimezone` (same idea as system clock).
 */
import type { WorkspacePrefsV1 } from "@/lib/workspace-prefs";
import { hourInTimezone } from "@/lib/timezone-date";

export const WORKSPACE_THEME_IDS = [
  "auto",
  "sunrise",
  "morning",
  "daytime",
  "sunset",
  "studio",
  "forest",
  "ocean",
  "pink",
  "cosmic",
  "oled",
  "evening",
  "night",
  "light",
  "dark",
  "classic",
] as const;

export type WorkspaceThemeId = (typeof WORKSPACE_THEME_IDS)[number];

const LIGHT_THEMES = new Set<Exclude<WorkspaceThemeId, "auto">>([
  "sunrise",
  "morning",
  "daytime",
  "sunset",
  "studio",
  "forest",
  "ocean",
  "pink",
  "light",
]);

/** Light UI shell — glass + cards use frosted light treatment (not OS dark flip). */
export function isLightWorkspacePalette(
  id: Exclude<WorkspaceThemeId, "auto">
): boolean {
  return LIGHT_THEMES.has(id);
}

/**
 * Resolved non-auto theme id for CSS: `workspace-theme-<id>`.
 * Follows local wall-clock hour in `workspaceTimezone` — full day arc with distinct looks.
 */
export function resolveAutoThemeFromHour(hour: number): Exclude<WorkspaceThemeId, "auto"> {
  if (hour >= 22 || hour < 4) return "oled";
  if (hour < 5) return "night";
  if (hour < 7) return "sunrise";
  if (hour < 10) return "morning";
  if (hour < 12) return "studio";
  if (hour < 14) return "forest";
  if (hour < 17) return "daytime";
  if (hour < 19) return "sunset";
  if (hour < 21) return "evening";
  return "cosmic";
}

function migrateLegacySchedule(
  prefs: WorkspacePrefsV1
): WorkspaceThemeId | undefined {
  if (prefs.appearanceTheme) return prefs.appearanceTheme;
  const s = prefs.appearanceSchedule;
  if (s === "day") return "daytime";
  if (s === "night") return "classic";
  if (s === "auto") return "auto";
  return undefined;
}

/**
 * Final theme id (auto expanded) and the single class name for the shell.
 */
export function resolveWorkspaceTheme(
  prefs: WorkspacePrefsV1,
  /** Minute tick so auto updates without reload. */
  _tick: number
): { themeId: WorkspaceThemeId; resolvedId: Exclude<WorkspaceThemeId, "auto">; cssClass: string } {
  void _tick;
  const migrated = migrateLegacySchedule(prefs);
  const raw: WorkspaceThemeId = migrated ?? prefs.appearanceTheme ?? "auto";
  const tz = prefs.workspaceTimezone;
  let resolved: Exclude<WorkspaceThemeId, "auto">;
  if (raw === "auto") {
    resolved = resolveAutoThemeFromHour(hourInTimezone(tz));
  } else {
    resolved = raw;
  }
  return {
    themeId: raw,
    resolvedId: resolved,
    cssClass: `workspace-theme-${resolved}`,
  };
}

export const WORKSPACE_THEME_LABELS: Record<Exclude<WorkspaceThemeId, "auto">, string> = {
  sunrise: "Sunrise — blush sky & soft gold",
  morning: "Morning — warm paper tones",
  daytime: "Daytime — lavender violet mesh (same family as the app shell)",
  sunset: "Sunset — amber, coral & violet dusk",
  studio: "Studio — neutral stone & ink (paper UI)",
  forest: "Forest — sage & mint calm (light)",
  ocean: "Ocean — cool sky blue (light)",
  pink: "Pink — rose & fuchsia mesh (light)",
  cosmic: "Cosmic — aurora teal & violet nebula",
  oled: "OLED — true black & high-contrast chrome",
  evening: "Evening — twilight contrast",
  night: "Night — calm dark (readable)",
  light: "Light — soft neutral workspace",
  dark: "Dark — neutral charcoal (no mesh)",
  classic: "Classic Route5 — violet & lime mesh",
};

export const WORKSPACE_THEME_DESCRIPTIONS: Record<Exclude<WorkspaceThemeId, "auto">, string> = {
  sunrise: "Rose, peach, and cool sky — low contrast until the day kicks in.",
  morning: "Cream and soft amber — easy on the eyes after dawn.",
  daytime: "Lavender / pink radial mesh on soft gray — Route5 marketing glass, tuned for readability.",
  sunset: "Golden-hour warmth with coral highlights — still readable for late work.",
  studio: "Warm stone canvas with near-black body copy and violet accents — built for long reading.",
  forest: "Soft green tint with deep emerald type — secondary text stays saturated, not gray-on-mint.",
  ocean: "Sky-tinted white with navy ink and cyan accents — crisp contrast for afternoon focus.",
  pink: "Rose and magenta highlights on a light canvas — secondary text uses a deep plum-gray for contrast.",
  cosmic: "Deep space canvas with cyan and violet glow — muted labels stay off-white, not mid-gray.",
  oled: "Pure black background with bright foreground and borders — maximum legibility on modern OLED panels.",
  evening: "Deep blue-gray background with light text — no glare.",
  night: "Dark UI tuned for contrast; borders stay visible.",
  light: "Apple-style light chrome — minimal tint.",
  dark: "OLED-friendly dark without colored haze.",
  classic: "The signature Route5 command look.",
};

/** Short labels for the theme picker grid (includes Auto). */
export const WORKSPACE_THEME_OPTION_LABELS: Record<WorkspaceThemeId, string> = {
  auto: "Auto",
  sunrise: "Sunrise",
  morning: "Morning",
  daytime: "Daytime",
  sunset: "Sunset",
  studio: "Studio",
  forest: "Forest",
  ocean: "Ocean",
  pink: "Pink",
  cosmic: "Cosmic",
  oled: "OLED",
  evening: "Evening",
  night: "Night",
  light: "Light",
  dark: "Dark",
  classic: "Classic",
};

export const WORKSPACE_THEME_AUTO_DESCRIPTION =
  "Follows your workspace timezone through the day: OLED / night → sunrise → morning → studio → forest → daytime → sunset → evening → cosmic → OLED, with smooth transitions.";
