/**
 * System location hints — same source iOS/macOS use on the web: `Intl` (no GPS permission).
 */

/** IANA zone from the browser (Apple / Chromium / Firefox all expose this). */
export function getBrowserIanaTimezone(): string {
  if (typeof Intl === "undefined") return "UTC";
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

/** BCP 47 locale for time formatting — matches OS language when available. */
export function getBrowserLocale(): string {
  if (typeof navigator === "undefined") return "en-US";
  return navigator.language || "en-US";
}

type RegionPin = {
  key: string;
  iana: string;
  lat: number;
  lon: number;
};

const PRECISE_REGION_PINS: RegionPin[] = [
  { key: "pittsford_ny", iana: "America/New_York", lat: 43.09, lon: -77.52 },
  { key: "nyc", iana: "America/New_York", lat: 40.7128, lon: -74.006 },
  { key: "boston_ma", iana: "America/New_York", lat: 42.3601, lon: -71.0589 },
  { key: "miami_fl", iana: "America/New_York", lat: 25.7617, lon: -80.1918 },
  { key: "henderson_nv", iana: "America/Los_Angeles", lat: 36.0395, lon: -114.9817 },
  { key: "las_vegas_nv", iana: "America/Los_Angeles", lat: 36.1699, lon: -115.1398 },
  { key: "los_angeles_ca", iana: "America/Los_Angeles", lat: 34.0522, lon: -118.2437 },
  { key: "laguna_beach_ca", iana: "America/Los_Angeles", lat: 33.5427, lon: -117.7854 },
  { key: "san_francisco_ca", iana: "America/Los_Angeles", lat: 37.7749, lon: -122.4194 },
];

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const a = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

export function inferPreciseRegionKeyFromCoords(
  latitude: number,
  longitude: number,
  ianaTimezone?: string | null
): string | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const scoped = ianaTimezone
    ? PRECISE_REGION_PINS.filter((pin) => pin.iana === ianaTimezone)
    : PRECISE_REGION_PINS;
  const candidates = scoped.length > 0 ? scoped : PRECISE_REGION_PINS;
  let nearest: { key: string; distance: number } | null = null;
  for (const pin of candidates) {
    const distance = haversineKm(latitude, longitude, pin.lat, pin.lon);
    if (!nearest || distance < nearest.distance) {
      nearest = { key: pin.key, distance };
    }
  }
  if (!nearest) return null;
  return nearest.distance <= 160 ? nearest.key : null;
}
