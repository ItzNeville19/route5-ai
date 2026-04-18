import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function getKey32(): Buffer {
  const hex = process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim();
  if (hex && /^[0-9a-fA-F]{64}$/.test(hex)) {
    return Buffer.from(hex, "hex");
  }
  const secret =
    process.env.SLACK_SIGNING_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "route5-dev-only-integrations-key";
  return scryptSync(secret, "route5-integrations-salt", 32);
}

/** Encrypt plaintext for storage in DB (server-only). */
export function encryptSecret(plain: string): string {
  const key = getKey32();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64url");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + 16);
  const data = buf.subarray(IV_LEN + 16);
  const key = getKey32();
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
