import crypto from "crypto";

export function verifySlackRequest(rawBody: string, timestamp: string | null, signature: string | null): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET?.trim();
  if (!signingSecret || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 60 * 5) return false;
  const base = `v0:${timestamp}:${rawBody}`;
  const h = crypto.createHmac("sha256", signingSecret).update(base).digest("hex");
  const expected = `v0=${h}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
