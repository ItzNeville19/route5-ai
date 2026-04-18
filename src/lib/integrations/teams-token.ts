import { decryptSecret } from "@/lib/integrations/token-crypto";
import type { OrgIntegrationRow } from "@/lib/integrations/types";
import { refreshTeamsAccessToken } from "@/lib/integrations/teams-oauth";
import { updateTeamsAccessTokenInPlace } from "@/lib/integrations/zoom-teams-integration";

const SKEW_MS = 120_000;

export async function getValidTeamsAccessToken(row: OrgIntegrationRow): Promise<string | null> {
  if (row.status !== "connected" || row.type !== "teams") return null;
  let access: string;
  try {
    access = decryptSecret(row.accessTokenEncrypted);
  } catch {
    return null;
  }
  if (!access) return null;

  const exp = row.metadata.teams_access_token_expires_at_ms;
  if (exp != null && Date.now() + SKEW_MS < exp) return access;

  const tenantId = row.teamId;
  if (!tenantId || !row.refreshTokenEncrypted) return access;
  let refresh: string;
  try {
    refresh = decryptSecret(row.refreshTokenEncrypted);
  } catch {
    return access;
  }
  if (!refresh) return access;

  try {
    const next = await refreshTeamsAccessToken({ tenantId, refreshToken: refresh });
    const expiresAt = Date.now() + (next.expires_in ?? 3600) * 1000;
    await updateTeamsAccessTokenInPlace(row.orgId, next.access_token, expiresAt);
    return next.access_token;
  } catch {
    return access;
  }
}
