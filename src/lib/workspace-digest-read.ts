/**
 * Tracks whether the workspace digest has been viewed — drives the red unread dot on the bell.
 * Fingerprint changes when summary data meaningfully changes (new run, stale count, etc.).
 */

const KEY_PREFIX = "route5:digestSeen.v1";

export function digestFingerprint(input: {
  projectCount: number;
  extractionCount: number;
  staleOpenActions: number;
  latestExtractionId: string | null;
  /** From execution overview — bumps digest when commitment risk changes. */
  commitmentOverdue?: number;
  commitmentAtRisk?: number;
  commitmentUnassigned?: number;
}): string {
  return [
    input.projectCount,
    input.extractionCount,
    input.staleOpenActions,
    input.latestExtractionId ?? "",
    input.commitmentOverdue ?? 0,
    input.commitmentAtRisk ?? 0,
    input.commitmentUnassigned ?? 0,
  ].join(":");
}

function storageKey(userId: string): string {
  return `${KEY_PREFIX}:${userId}`;
}

export function getSeenDigestFingerprint(userId: string | undefined): string | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

export function markDigestFingerprintSeen(userId: string | undefined, fingerprint: string) {
  if (!userId || typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), fingerprint);
  } catch {
    /* ignore quota */
  }
}

/** Empty workspace — no red dot until there is something to show. */
const EMPTY_HINT = "0:0:0:";

export function isDigestUnread(userId: string | undefined, fingerprint: string): boolean {
  if (!userId) return false;
  const seen = getSeenDigestFingerprint(userId);
  if (fingerprint === EMPTY_HINT) return false;
  if (seen === null) return true;
  return seen !== fingerprint;
}
