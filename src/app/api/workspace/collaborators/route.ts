import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { listDistinctOwnerIdsForOrg } from "@/lib/org-commitments/repository";

export const runtime = "nodejs";

/**
 * Workspace people: commitment owners plus (when available) active Clerk organization members,
 * resolved to real names and profile images.
 */
export async function GET() {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

  try {
    const { orgId } = await auth();
    const ownerIds = new Set(await listDistinctOwnerIdsForOrg(userId));
    ownerIds.add(userId);

    const c = await clerkClient();
    if (orgId) {
      try {
        let offset = 0;
        for (let page = 0; page < 5; page++) {
          const list = await c.organizations.getOrganizationMembershipList({
            organizationId: orgId,
            limit: 100,
            offset,
          });
          for (const m of list.data ?? []) {
            const uid = m.publicUserData?.userId;
            if (uid) ownerIds.add(uid);
          }
          if (!list.data?.length || list.data.length < 100) break;
          offset += 100;
        }
      } catch {
        /* org roster is best-effort */
      }
    }

    const ids = [...ownerIds].slice(0, 80);
    const collaborators = await Promise.all(
      ids.map(async (oid) => {
        try {
          const u = await c.users.getUser(oid);
          return {
            userId: oid,
            firstName: u.firstName,
            lastName: u.lastName,
            username: u.username,
            imageUrl: u.imageUrl,
            primaryEmail: u.primaryEmailAddress?.emailAddress ?? null,
          };
        } catch {
          return {
            userId: oid,
            firstName: null,
            lastName: null,
            username: null,
            imageUrl: null,
            primaryEmail: null,
          };
        }
      })
    );
    return NextResponse.json({ collaborators });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not load collaborators." },
      { status: 503 }
    );
  }
}
