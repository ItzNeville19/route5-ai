const DEFAULT_FORWARDING_DOMAIN = "route5.ai";

function normalizeDomain(value: string | undefined): string {
  const cleaned = (value ?? "").trim().toLowerCase();
  if (!cleaned) return DEFAULT_FORWARDING_DOMAIN;
  return cleaned.replace(/^@+/, "");
}

export function encodeOrgIdForForwarding(orgId: string): string {
  return Buffer.from(orgId, "utf8").toString("base64url");
}

export function decodeOrgIdFromForwarding(localPart: string): string | null {
  if (!localPart.startsWith("org-")) return null;
  const encoded = localPart.slice(4).trim();
  if (!encoded) return null;
  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf8").trim();
    return decoded || null;
  } catch {
    return null;
  }
}

export function getForwardingDomain(): string {
  return normalizeDomain(process.env.ROUTE5_FORWARDING_DOMAIN);
}

export function getForwardingAddressForOrg(orgId: string): string {
  return `org-${encodeOrgIdForForwarding(orgId)}@${getForwardingDomain()}`;
}

export function parseForwardingAddressToOrgId(address: string): string | null {
  const value = address.trim().toLowerCase();
  const at = value.lastIndexOf("@");
  if (at <= 0) return null;
  const local = value.slice(0, at);
  return decodeOrgIdFromForwarding(local);
}
