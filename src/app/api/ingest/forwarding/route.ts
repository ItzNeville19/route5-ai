import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/require-user";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getForwardingAddressForOrg, getForwardingDomain } from "@/lib/workspace/email-forwarding";

export const runtime = "nodejs";

/**
 * Signed-in users: returns this org's inbound forwarding address.
 */
export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const orgId = await ensureOrganizationForClerkUser(authz.userId);

  return NextResponse.json({
    enabled: true,
    orgId,
    forwardingAddress: getForwardingAddressForOrg(orgId),
    forwardingDomain: getForwardingDomain(),
    notes: "Forward any decision email to this address to capture commitments.",
  });
}
