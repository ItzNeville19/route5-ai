/**
 * Friendly place names for hero copy — tied to IANA zone + optional region key.
 * Uses the same clock source as Apple platforms on the web: `Intl` (no GPS).
 * “Columbia” (US cities) vs “Colombia” (country) are both listed where relevant.
 */
import { shortTimezoneLabel } from "@/lib/timezone-date";
import { getBrowserIanaTimezone } from "@/lib/workspace-location";

export type WorkspaceRegionKey = string;

export type RegionOption = { key: string; label: string };

/** Regions per IANA zone (same offset; labels are how we *say* the place in UI). */
export const REGIONS_BY_IANA: Record<string, RegionOption[]> = {
  "America/New_York": [
    { key: "bidford_ny", label: "Bidford, NY" },
    { key: "nyc", label: "New York City" },
    { key: "long_island", label: "Long Island" },
    { key: "nassau_ny", label: "Nassau County, NY" },
    { key: "pittsford_ny", label: "Pittsford, NY" },
    { key: "buffalo_ny", label: "Buffalo, NY" },
    { key: "boston_ma", label: "Boston, MA" },
    { key: "philadelphia_pa", label: "Philadelphia, PA" },
    { key: "washington_dc", label: "Washington, DC" },
    { key: "miami_fl", label: "Miami, FL" },
    { key: "atlanta_ga", label: "Atlanta, GA" },
    { key: "columbia_sc", label: "Columbia, SC" },
  ],
  "America/Chicago": [
    { key: "chicago_il", label: "Chicago, IL" },
    { key: "dallas_tx", label: "Dallas, TX" },
    { key: "houston_tx", label: "Houston, TX" },
    { key: "minneapolis_mn", label: "Minneapolis, MN" },
    { key: "columbia_mo", label: "Columbia, MO" },
  ],
  "America/Denver": [
    { key: "denver_co", label: "Denver, CO" },
    { key: "phoenix_az", label: "Phoenix, AZ" },
    { key: "salt_lake_city_ut", label: "Salt Lake City, UT" },
  ],
  "America/Los_Angeles": [
    { key: "henderson_nv", label: "Henderson, NV" },
    { key: "laguna_beach_ca", label: "Laguna Beach, CA" },
    { key: "los_angeles_ca", label: "Los Angeles" },
    { key: "las_vegas_nv", label: "Las Vegas, NV" },
    { key: "san_francisco_ca", label: "San Francisco" },
    { key: "seattle_wa", label: "Seattle, WA" },
    { key: "portland_or", label: "Portland, OR" },
    { key: "san_diego_ca", label: "San Diego, CA" },
  ],
  "America/Toronto": [
    { key: "toronto_on", label: "Toronto" },
    { key: "montreal_qc", label: "Montreal" },
    { key: "ottawa_on", label: "Ottawa" },
  ],
  "America/Vancouver": [{ key: "vancouver_bc_alt", label: "Vancouver, BC" }],
  "America/Mexico_City": [
    { key: "mexico_city", label: "Mexico City" },
    { key: "guadalajara", label: "Guadalajara" },
    { key: "monterrey", label: "Monterrey" },
  ],
  /** Colombia — country; not “Columbia” (US). */
  "America/Bogota": [
    { key: "bogota", label: "Bogotá" },
    { key: "medellin", label: "Medellín" },
    { key: "cali_co", label: "Cali" },
    { key: "cartagena_co", label: "Cartagena" },
    { key: "barranquilla", label: "Barranquilla" },
    { key: "bucaramanga", label: "Bucaramanga" },
  ],
  "America/Lima": [{ key: "lima", label: "Lima" }],
  "America/Santiago": [{ key: "santiago_cl", label: "Santiago" }],
  "America/Buenos_Aires": [{ key: "buenos_aires", label: "Buenos Aires" }],
  /** Legacy IANA id — prefer `America/Buenos_Aires`. */
  "America/Argentina/Buenos_Aires": [{ key: "buenos_aires", label: "Buenos Aires" }],
  "America/Sao_Paulo": [
    { key: "sao_paulo", label: "São Paulo" },
    { key: "rio_de_janeiro", label: "Rio de Janeiro" },
    { key: "brasilia", label: "Brasília" },
  ],
  "Europe/London": [
    { key: "london", label: "London" },
    { key: "manchester", label: "Manchester" },
    { key: "edinburgh", label: "Edinburgh" },
  ],
  "Europe/Dublin": [{ key: "dublin", label: "Dublin" }],
  "Europe/Paris": [
    { key: "paris", label: "Paris" },
    { key: "lyon", label: "Lyon" },
  ],
  "Europe/Berlin": [
    { key: "berlin", label: "Berlin" },
    { key: "munich", label: "Munich" },
  ],
  "Europe/Madrid": [
    { key: "madrid", label: "Madrid" },
    { key: "barcelona", label: "Barcelona" },
  ],
  "Europe/Amsterdam": [{ key: "amsterdam", label: "Amsterdam" }],
  "Europe/Brussels": [{ key: "brussels", label: "Brussels" }],
  "Europe/Zurich": [{ key: "zurich", label: "Zurich" }],
  "Europe/Stockholm": [{ key: "stockholm", label: "Stockholm" }],
  "Europe/Warsaw": [{ key: "warsaw", label: "Warsaw" }],
  "Africa/Johannesburg": [{ key: "johannesburg", label: "Johannesburg" }],
  "Asia/Dubai": [{ key: "dubai", label: "Dubai" }],
  "Asia/Riyadh": [{ key: "riyadh", label: "Riyadh" }],
  "Asia/Tel_Aviv": [{ key: "tel_aviv", label: "Tel Aviv" }],
  "Asia/Kolkata": [
    { key: "mumbai", label: "Mumbai" },
    { key: "delhi", label: "Delhi NCR" },
    { key: "bangalore", label: "Bengaluru" },
    { key: "hyderabad", label: "Hyderabad" },
    { key: "chennai", label: "Chennai" },
    { key: "kolkata", label: "Kolkata" },
    { key: "pune", label: "Pune" },
    { key: "ahmedabad", label: "Ahmedabad" },
    { key: "jaipur", label: "Jaipur" },
    { key: "kochi", label: "Kochi" },
  ],
  "Asia/Bangkok": [{ key: "bangkok", label: "Bangkok" }],
  "Asia/Singapore": [{ key: "singapore", label: "Singapore" }],
  "Asia/Hong_Kong": [{ key: "hong_kong", label: "Hong Kong" }],
  "Asia/Shanghai": [
    { key: "shanghai", label: "Shanghai" },
    { key: "beijing", label: "Beijing" },
  ],
  "Asia/Seoul": [{ key: "seoul", label: "Seoul" }],
  "Asia/Tokyo": [
    { key: "tokyo", label: "Tokyo" },
    { key: "osaka", label: "Osaka" },
  ],
  "Australia/Sydney": [
    { key: "sydney", label: "Sydney" },
    { key: "melbourne", label: "Melbourne" },
  ],
  "Pacific/Auckland": [{ key: "auckland", label: "Auckland" }],
  "America/Winnipeg": [{ key: "winnipeg", label: "Winnipeg" }],
  UTC: [{ key: "utc", label: "UTC" }],
};

/**
 * Default curated place key per IANA zone when the user hasn’t picked one —
 * maps the system clock zone (from `Intl`) to a friendly “you are here” label.
 */
export const PREFERRED_REGION_KEY_BY_IANA: Record<string, string> = {
  "America/New_York": "bidford_ny",
  "America/Chicago": "chicago_il",
  "America/Denver": "denver_co",
  "America/Los_Angeles": "los_angeles_ca",
  "America/Toronto": "toronto_on",
  "America/Vancouver": "vancouver_bc_alt",
  "America/Mexico_City": "mexico_city",
  "America/Bogota": "bogota",
  "America/Lima": "lima",
  "America/Santiago": "santiago_cl",
  "America/Buenos_Aires": "buenos_aires",
  "America/Argentina/Buenos_Aires": "buenos_aires",
  "America/Sao_Paulo": "sao_paulo",
  "Europe/London": "london",
  "Europe/Dublin": "dublin",
  "Europe/Paris": "paris",
  "Europe/Berlin": "berlin",
  "Europe/Madrid": "madrid",
  "Europe/Amsterdam": "amsterdam",
  "Europe/Brussels": "brussels",
  "Europe/Zurich": "zurich",
  "Europe/Stockholm": "stockholm",
  "Europe/Warsaw": "warsaw",
  "Africa/Johannesburg": "johannesburg",
  "Asia/Dubai": "dubai",
  "Asia/Riyadh": "riyadh",
  "Asia/Tel_Aviv": "tel_aviv",
  "Asia/Kolkata": "mumbai",
  "Asia/Bangkok": "bangkok",
  "Asia/Singapore": "singapore",
  "Asia/Hong_Kong": "hong_kong",
  "Asia/Shanghai": "shanghai",
  "Asia/Seoul": "seoul",
  "Asia/Tokyo": "tokyo",
  "Australia/Sydney": "sydney",
  "Pacific/Auckland": "auckland",
  "America/Winnipeg": "winnipeg",
  UTC: "utc",
};

/** Best default region key for an IANA zone (for auto-filled “It’s … in …” copy). */
export function inferRegionKeyForTimezone(iana: string | undefined): string | undefined {
  const tz = iana?.trim();
  if (!tz) return undefined;
  const preferred = PREFERRED_REGION_KEY_BY_IANA[tz];
  const list = REGIONS_BY_IANA[tz];
  if (preferred && list?.some((r) => r.key === preferred)) return preferred;
  return list?.[0]?.key;
}

export function regionsForTimezone(iana: string | undefined): RegionOption[] {
  const tz = iana?.trim();
  if (!tz) return [];
  return REGIONS_BY_IANA[tz] ?? [];
}

/** Label for hero / briefings — uses region when set; otherwise infers from zone (system clock). */
export function getDisplayLocationLabel(
  timezone: string | undefined,
  regionKey: string | undefined
): string {
  const tz = timezone?.trim();
  if (!tz) return "";
  const regions = REGIONS_BY_IANA[tz];
  const resolvedKey = regionKey?.trim() || inferRegionKeyForTimezone(tz);
  if (regions && resolvedKey) {
    const found = regions.find((r) => r.key === resolvedKey);
    if (found) return found.label;
  }
  return shortTimezoneLabel(timezone);
}

/** If region key doesn’t match the zone (e.g. after timezone change), drop it. */
export function normalizeRegionKeyForTimezone(
  timezone: string | undefined,
  regionKey: string | undefined
): string | undefined {
  const tz = timezone?.trim();
  if (!tz || !regionKey) return undefined;
  const regions = REGIONS_BY_IANA[tz];
  if (!regions?.some((r) => r.key === regionKey)) return undefined;
  return regionKey;
}

/** Map a saved region key (e.g. `las_vegas_nv`) to its IANA zone (e.g. `America/Los_Angeles`). */
export function ianaTimezoneForRegionKey(regionKey: string | undefined): string | undefined {
  const k = regionKey?.trim();
  if (!k) return undefined;
  for (const [iana, regions] of Object.entries(REGIONS_BY_IANA)) {
    if (regions.some((r) => r.key === k)) return iana;
  }
  return undefined;
}

/**
 * Workspace clock + hero copy: prefer explicit IANA; else infer from region; else browser.
 */
export function getWorkspaceIanaTimeZone(
  workspaceTimezone: string | undefined,
  workspaceRegionKey: string | undefined
): string {
  const tz = workspaceTimezone?.trim();
  if (tz) return tz;
  const fromRegion = ianaTimezoneForRegionKey(workspaceRegionKey);
  if (fromRegion) return fromRegion;
  return getBrowserIanaTimezone();
}
