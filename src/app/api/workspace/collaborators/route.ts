import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { listDistinctOwnerIdsForOrg } from "@/lib/org-commitments/repository";

export const runtime = "nodejs";

/**
 * People who currently own at least one org commitment — resolved via Clerk (real profiles).
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ownerIds = await listDistinctOwnerIdsForOrg(userId);
    const c = await clerkClient();
    const collaborators = await Promise.all(
      ownerIds.slice(0, 48).map(async (oid) => {
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
