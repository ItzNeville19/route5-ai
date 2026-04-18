import { createHmac, timingSafeEqual } from "crypto";

/** Verify Zoom webhook `x-zm-signature` (v0) per Zoom docs. */
export function verifyZoomWebhookSignature(rawBody: string, headers: Headers): boolean {
  const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN?.trim();
  if (!secret) return false;
  const ts = headers.get("x-zm-request-timestamp");
  const sig = headers.get("x-zm-signature");
  if (!ts || !sig) return false;
  const msg = `v0:${ts}:${rawBody}`;
  const hash = createHmac("sha256", secret).update(msg, "utf8").digest("hex");
  const expected = `v0=${hash}`;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
