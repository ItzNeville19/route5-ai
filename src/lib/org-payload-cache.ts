const CACHE_KEY = "route5.org.payload.v1";

type CachedOrg = {
  savedAt: string;
  payload: unknown;
};

export function readCachedOrgPayload(): unknown | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as CachedOrg;
    if (p && typeof p === "object" && p.payload) return p.payload;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeCachedOrgPayload(payload: unknown): void {
  if (typeof window === "undefined") return;
  try {
    const data: CachedOrg = {
      savedAt: new Date().toISOString(),
      payload,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearCachedOrgPayload(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
