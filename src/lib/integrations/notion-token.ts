import { decryptSecret } from "@/lib/integrations/token-crypto";
import type { OrgIntegrationRow } from "@/lib/integrations/types";

export function getNotionAccessToken(row: OrgIntegrationRow): string | null {
  if (row.status !== "connected" || row.type !== "notion") return null;
  try {
    const t = decryptSecret(row.accessTokenEncrypted);
    return t.length > 0 ? t : null;
  } catch {
    return null;
  }
}
