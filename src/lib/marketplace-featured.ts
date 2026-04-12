import { ALL_MARKETPLACE_APPS } from "@/lib/marketplace-catalog";

/** Deterministic PRNG for daily rotation (same order for all users on a given UTC day). */
function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FEATURE_CANDIDATES = [
  "nvidia-parakeet",
  "whisperkit",
  "groq-asr",
  "linear",
  "virtual-desk",
  "github-issues",
  "openai",
  "supabase",
  "clerk",
  "figma",
  "google-workspace",
  "notion",
  "slack",
] as const;

/**
 * Up to 6 marketplace app ids, rotated by UTC calendar day so the strip stays fresh
 * without random broken picks — only ids that exist in the catalog are returned.
 */
export function featuredMarketplaceAppIdsForUtcDay(d = new Date()): string[] {
  const valid = new Set(ALL_MARKETPLACE_APPS.map((a) => a.id));
  const pool = FEATURE_CANDIDATES.filter((id) => valid.has(id));
  const dayIndex = Math.floor(d.getTime() / 86_400_000);
  const rng = mulberry32(dayIndex * 100_003 + 777);
  const ids = [...pool];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  return ids.slice(0, 6);
}
