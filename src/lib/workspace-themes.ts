/**
 * Workspace appearance themes — all use explicit CSS tokens (no white-on-white / dark-on-dark).
 * `auto` picks a theme from **time of day** in the workspace timezone (predictable daily rhythm).
 */
import type { WorkspacePrefsV1 } from "@/lib/workspace-prefs";
import { hourInTimezone } from "@/lib/timezone-date";

export const WORKSPACE_THEME_IDS = [
  "auto",
  "sunrise",
  "morning",
  "daytime",
  "sunset",
  "ember",
  "ocean",
  "lagunabeach",
  "sanfrancisco",
  "nevada",
  "mumbai",
  "columbia",
  "studio",
  "forest",
  "pink",
  "cosmic",
  "vegas",
  "nyc",
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
  "ember",
  "ocean",
  "lagunabeach",
  "sanfrancisco",
  "nevada",
  "mumbai",
  "columbia",
  "studio",
  "forest",
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
 * Auto theme follows **local wall-clock phases** only (no random city hopping).
 * City / regional themes stay available from the picker; Auto is sunrise → night in order.
 */
export function resolveAutoThemeFromHour(hour: number): Exclude<WorkspaceThemeId, "auto"> {
  // Deep night → OLED calm
  if (hour >= 0 && hour <= 4) return "oled";
  // Dawn
  if (hour === 5 || hour === 6) return "sunrise";
  // Morning paper / warm start
  if (hour >= 7 && hour <= 9) return "morning";
  // Core workday (single coherent light mesh)
  if (hour >= 10 && hour <= 15) return "daytime";
  // Golden hour through dusk
  if (hour >= 16 && hour <= 17) return "sunset";
  // Late dusk / twilight ink
  if (hour === 18 || hour === 19) return "ember";
  // Evening chrome (readable dark-blue, not a random city)
  if (hour >= 20 && hour <= 22) return "evening";
  // Late evening → settle into night before OLED cycle repeats
  return "night";
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
  ember: "Ember — crimson & rose twilight (after golden hour)",
  ocean: "Ocean — turquoise water & offshore sky",
  lagunabeach: "Laguna Beach — teal Pacific coast glass",
  sanfrancisco: "San Francisco — Karl fog & bay steel blue",
  nevada: "Nevada desert — sandstone & Joshua gold",
  mumbai: "Mumbai — chai cream & ochre bustle",
  columbia: "Columbia — parchment coffee & evergreen campus",
  studio: "Studio — neutral stone & ink (paper UI)",
  forest: "Forest — sage & mint calm (light)",
  pink: "Pink — rose & fuchsia mesh (light)",
  cosmic: "Cosmic — aurora teal & violet nebula",
  vegas: "Las Vegas — neon dusk strip on velvet",
  nyc: "New York City — skyline midnight cobalt",
  oled: "OLED — true black & high-contrast chrome",
  evening: "Evening — twilight contrast",
  night: "Night — calm dark (readable)",
  light: "Light — soft neutral workspace",
  dark: "Dark — neutral charcoal (no mesh)",
  classic: "Default — violet & lime mesh (Route5 signature)",
};

export const WORKSPACE_THEME_DESCRIPTIONS: Record<Exclude<WorkspaceThemeId, "auto">, string> = {
  sunrise: "Rose, peach, and cool sky — low contrast until the day kicks in.",
  morning: "Cream and soft amber — easy on the eyes after dawn.",
  daytime: "Lavender / pink radial mesh on soft gray — Route5 marketing glass, tuned for readability.",
  sunset: "Golden-hour warmth with coral highlights — still readable for late work.",
  ember: "Deep rose and crimson ink — pairs with Auto after amber sunset; contrast stays WCAG-friendly.",
  ocean: "Deep cyan-to-navy water bands with mist sky — reads like open ocean in daylight.",
  lagunabeach: "Coastal sage glass and Pacific teal — Auto uses this around dawn along the coast.",
  sanfrancisco: "Cool slate fog bank over bay blue — readable gray ink, never washed out.",
  nevada: "High-desert warmth with burnt sierra accents — bold type on sand canvas.",
  mumbai: "Warm ivory field with turmeric and spice accents — dense color that stays legible.",
  columbia: "Scholarly cream with espresso notes — ivy-adjacent green anchor for contrast.",
  studio: "Warm stone canvas with near-black body copy and violet accents — built for long reading.",
  forest: "Soft green tint with deep emerald type — secondary text stays saturated, not gray-on-mint.",
  pink: "Rose and magenta highlights on a light canvas — secondary text uses a deep plum-gray for contrast.",
  cosmic: "Deep space canvas with cyan and violet glow — muted labels stay off-white, not mid-gray.",
  vegas: "Deep violet-black field with magenta & cyan neon accents — nightlife contrast without glare.",
  nyc: "Midnight harbor blues with amber taxi highlights — Manhattan grid energy for late focus.",
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
  ember: "Ember",
  ocean: "Ocean",
  lagunabeach: "Laguna Beach",
  sanfrancisco: "San Francisco",
  nevada: "Nevada",
  mumbai: "Mumbai",
  columbia: "Columbia",
  studio: "Studio",
  forest: "Forest",
  pink: "Pink",
  cosmic: "Cosmic",
  vegas: "Las Vegas",
  nyc: "New York City",
  oled: "OLED",
  evening: "Evening",
  night: "Night",
  light: "Light",
  dark: "Dark",
  classic: "Classic",
};

export const WORKSPACE_THEME_AUTO_DESCRIPTION =
  "Follows your workspace timezone by time of day: sunrise → morning → daytime work surface → sunset → ember twilight → evening → night → OLED deep night — predictable every day.";
