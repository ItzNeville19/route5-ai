/** In-memory sliding window per API key (best-effort on multi-instance). */

const buckets = new Map<string, number[]>();
const WINDOW_MS = 60_000;

function prune(ts: number[]): number[] {
  const cutoff = Date.now() - WINDOW_MS;
  return ts.filter((t) => t > cutoff);
}

export function checkApiKeyRateLimit(apiKeyId: string, maxPerMinute: number): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const prev = prune(buckets.get(apiKeyId) ?? []);
  if (prev.length >= maxPerMinute) {
    const oldest = Math.min(...prev);
    const retryAfterSec = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  prev.push(now);
  buckets.set(apiKeyId, prev);
  return { ok: true };
}

export function publicApiRateLimitPerMinute(): number {
  const raw = process.env.PUBLIC_API_RATE_LIMIT_PER_MINUTE?.trim();
  const n = raw ? Number(raw) : 100;
  return Number.isFinite(n) && n > 0 ? Math.min(1000, Math.floor(n)) : 100;
}
