import { createHash, randomBytes } from "crypto";
import { updateApiKeyLastUsed } from "@/lib/public-api/keys-store";
import type { ApiScope } from "@/lib/public-api/types";

const PREFIX = "r5_live_";

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

/** Returns full key once — format r5_live_{32 hex chars}. */
export function generateApiKey(): string {
  const suffix = randomBytes(16).toString("hex");
  return `${PREFIX}${suffix}`;
}

export function keyPrefixFromPlaintext(plaintext: string): string {
  return plaintext.slice(0, 8);
}

export type ValidatedApiKey = {
  orgId: string;
  keyId: string;
  scopes: ApiScope[];
};

export async function validateApiKey(plaintext: string): Promise<ValidatedApiKey | null> {
  const trimmed = plaintext.trim();
  if (!trimmed.startsWith(PREFIX) || trimmed.length < PREFIX.length + 16) {
    return null;
  }
  const h = hashApiKey(trimmed);
  const { findApiKeyByHash } = await import("@/lib/public-api/keys-store");
  const row = await findApiKeyByHash(h);
  if (!row || row.revoked) return null;
  if (row.expiresAt) {
    const t = new Date(row.expiresAt).getTime();
    if (Number.isFinite(t) && t < Date.now()) return null;
  }
  const raw = Array.isArray(row.scopes) ? row.scopes : (["read"] as const);
  let scopes: ApiScope[] = raw.filter((s): s is ApiScope => s === "read" || s === "write" || s === "webhooks");
  if (scopes.length === 0) scopes = ["read"];
  void updateApiKeyLastUsed(row.id);
  return { orgId: row.orgId, keyId: row.id, scopes };
}
