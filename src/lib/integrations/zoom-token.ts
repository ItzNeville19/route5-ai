import { decryptSecret } from "@/lib/integrations/token-crypto";
import type { OrgIntegrationRow } from "@/lib/integrations/types";
import { refreshZoomAccessToken } from "@/lib/integrations/zoom-oauth";
import { updateZoomAccessTokenInPlace } from "@/lib/integrations/zoom-teams-integration";

const SKEW_MS = 120_000;

export async function getValidZoomAccessToken(row: OrgIntegrationRow): Promise<string | null> {
  if (row.status !== "connected" || row.type !== "zoom") return null;
  let access: string;
  try {
    access = decryptSecret(row.accessTokenEncrypted);
  } catch {
    return null;
  }
  if (!access) return null;

  const exp = row.metadata.zoom_access_token_expires_at_ms;
  if (exp != null && Date.now() + SKEW_MS < exp) return access;

  if (!row.refreshTokenEncrypted) return access;
  let refresh: string;
  try {
    refresh = decryptSecret(row.refreshTokenEncrypted);
  } catch {
    return access;
  }
  if (!refresh) return access;

  try {
    const next = await refreshZoomAccessToken(refresh);
    const expiresAt = Date.now() + (next.expires_in ?? 3600) * 1000;
    await updateZoomAccessTokenInPlace(row.orgId, next.access_token, expiresAt);
    return next.access_token;
  } catch {
    return access;
  }
}
