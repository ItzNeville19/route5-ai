/**
 * Lightweight sky model for the Desk greeting — readable arcs for sun position and phase,
 * not observatory-grade astronomy (no lat/lon required).
 */

export type DeskSkyPhase =
  | "deep_night"
  | "dawn"
  | "day"
  | "golden"
  | "sunset"
  | "dusk"
  | "night";

export type DeskSolarVisual = {
  phase: DeskSkyPhase;
  /** Sun center, % from left (0–100). */
  sunLeftPct: number;
  /** Sun center, % from top — lower value = higher in the sky. */
  sunTopPct: number;
  /** 0 before sunrise / after sunset (sun below horizon). */
  sunVisible: boolean;
  /** Daylight progress 0..1 between sunrise and sunset. */
  dayProgress: number;
};

function dayOfYearUTC(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start;
  return Math.floor(diff / 86400000);
}

/** Seasonal shift for mid-latitude (~40°N): longer summer days, shorter winter. */
function seasonalBounds(dayOfYear: number): { sunrise: number; sunset: number } {
  const seasonal = Math.sin((2 * Math.PI * (dayOfYear - 80)) / 365);
  const sunrise = 6.2 + seasonal * 0.85;
  const sunset = 19.4 + seasonal * 1.15;
  return { sunrise, sunset };
}

function hourDecimalInZone(now: Date, ianaTimeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: ianaTimeZone,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(now);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "12");
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return h + m / 60;
  } catch {
    return now.getHours() + now.getMinutes() / 60;
  }
}

/**
 * Decorative rule for the greeting card: **sun** while the sun “belongs” to the working day (< 5 PM),
 * **moon** from 5 PM onward and overnight — moon track follows a night arc (sinking toward the horizon).
 */
export function celestialsForCard(now: Date, ianaTimeZone: string): {
  solar: DeskSolarVisual;
  showSun: boolean;
  showMoon: boolean;
  moonLeftPct: number;
  moonTopPct: number;
} {
  const solar = computeDeskSolarVisual(now, ianaTimeZone);
  const t = hourDecimalInZone(now, ianaTimeZone);
  const doy = dayOfYearUTC(now);
  const { sunrise, sunset } = seasonalBounds(doy);

  /** 0 .. 1 across local “night corridor” after sunset until sunrise. */
  let nightSpan = 24 - sunset + sunrise;
  if (nightSpan <= 0.01) nightSpan = 12;
  let nightElapsed = 0;
  if (t >= sunset) nightElapsed = t - sunset;
  else if (t < sunrise) nightElapsed = t + 24 - sunset;
  const np = Math.max(0, Math.min(1, nightElapsed / nightSpan));
  const moonArc = Math.sin(Math.PI * np);
  const moonLeftPct = 90 - np * 78;
  const moonTopPct = 54 - moonArc * 42;

  const moonPeriod =
    t >= 17 ||
    t < sunrise ||
    solar.phase === "dusk" ||
    solar.phase === "night" ||
    solar.phase === "deep_night";

  const showSun = Boolean(solar.sunVisible && !moonPeriod && solar.phase !== "dusk");
  let showMoon = moonPeriod || (!showSun && t >= sunset - 0.25);
  if (showSun) showMoon = false;

  return {
    solar,
    showSun,
    showMoon,
    moonLeftPct,
    moonTopPct,
  };
}

export function computeDeskSolarVisual(now: Date, ianaTimeZone: string): DeskSolarVisual {
  const doy = dayOfYearUTC(now);
  const { sunrise, sunset } = seasonalBounds(doy);
  const t = hourDecimalInZone(now, ianaTimeZone);
  const span = Math.max(0.01, sunset - sunrise);

  let phase: DeskSkyPhase;
  if (t < 4 || t >= 23) phase = "deep_night";
  else if (t < sunrise - 0.75) phase = "night";
  else if (t < sunrise + 0.85) phase = "dawn";
  else if (t < sunrise + span * 0.35) phase = "day";
  else if (t < sunrise + span * 0.62) phase = "golden";
  else if (t < sunset - 0.35) phase = "sunset";
  else if (t < sunset + 0.9) phase = "dusk";
  else if (t < 22) phase = "night";
  else phase = "deep_night";

  let dayProgress = (t - sunrise) / span;
  dayProgress = Math.max(0, Math.min(1, dayProgress));

  /** Parabolic arc: horizon at ends, highest near noon. */
  const arc = Math.sin(Math.PI * dayProgress);
  const sunLeftPct = 7 + dayProgress * 86;
  const sunTopPct = 56 - arc * 46;

  const sunVisible = t >= sunrise - 0.25 && t <= sunset + 0.35;

  return {
    phase,
    sunLeftPct,
    sunTopPct,
    sunVisible,
    dayProgress,
  };
}
