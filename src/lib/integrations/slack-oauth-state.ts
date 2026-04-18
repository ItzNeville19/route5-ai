import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  return (
    process.env.SLACK_STATE_SECRET?.trim() ||
    process.env.SLACK_SIGNING_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "route5-dev-slack-state"
  );
}

export function signSlackOAuthState(userId: string): string {
  const payload = JSON.stringify({ u: userId, exp: Date.now() + 15 * 60 * 1000 });
  const b64 = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", secret()).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifySlackOAuthState(state: string): string | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  if (!b64 || !sig) return null;
  const expected = createHmac("sha256", secret()).update(b64).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as { u: string; exp: number };
  if (!payload.u || typeof payload.exp !== "number") return null;
  if (payload.exp < Date.now()) return null;
  return payload.u;
}
