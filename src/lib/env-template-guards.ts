/**
 * True when a value is almost certainly not a real secret (tutorial strings, typos).
 * Must NOT substring-match "placeholder" — real JWTs can contain that sequence in base64.
 */
export function looksLikeTutorialOrEmptySecret(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (/^YOUR_/i.test(v)) return true;
  const lower = v.toLowerCase();
  if (lower === "placeholder" || lower === "changeme" || lower === "replace_me") {
    return true;
  }
  if (/^xxx+$/i.test(v)) return true;
  return false;
}
