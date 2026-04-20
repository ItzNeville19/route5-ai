import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import * as sqlite from "@/lib/workspace/sqlite";
import { ensureOrgMember, getActiveMembershipForUser } from "@/lib/workspace/org-members";
import { clerkClient } from "@clerk/nextjs/server";
import { sendNotification } from "@/lib/notifications/service";

async function sendWelcomeOnce(userId: string, orgId: string): Promise<void> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const meta = (user.privateMetadata ?? {}) as Record<string, unknown>;
    if (meta.route5WelcomeSent === true) return;
    await sendNotification({
      orgId,
      userId,
      type: "welcome_workspace",
      title: "Welcome to Route5",
      body: "Capture your decisions, assign commitments, and run execution from one place.",
      metadata: { link: "/desk" },
      forceChannels: { inApp: true, email: true, slack: false },
    });
    await client.users.updateUser(userId, {
      privateMetadata: {
        ...meta,
        route5WelcomeSent: true,
      },
    });
  } catch {
    /* best effort */
  }
}

/**
 * Ensures a single organization row exists for this Clerk user (1:1 for now),
 * backfills `projects.org_id` where null. Safe to call on every request; idempotent.
 */
export async function ensureOrganizationForClerkUser(userId: string): Promise<string> {
  const activeMembership = await getActiveMembershipForUser(userId);
  if (activeMembership?.orgId) {
    return activeMembership.orgId;
  }
  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceClient();
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("organizations")
        .upsert(
          { clerk_user_id: userId, name: "Workspace", updated_at: now },
          { onConflict: "clerk_user_id" }
        )
        .select("id")
        .single();
      if (error) throw error;
      const orgId = (data as { id: string }).id;
      const { error: patchErr } = await supabase
        .from("projects")
        .update({ org_id: orgId })
        .eq("clerk_user_id", userId)
        .is("org_id", null);
      if (patchErr) throw patchErr;
      await ensureOrgMember({
        orgId,
        userId,
        role: "admin",
        invitedBy: userId,
        status: "active",
      });
      await sendWelcomeOnce(userId, orgId);
      return orgId;
    } catch (e) {
      console.error(
        "[org-bridge] Supabase organization sync failed — falling back to embedded SQLite. Fix Supabase env/migrations if you expect Postgres.",
        e
      );
    }
  }
  const orgId = sqlite.ensureOrganizationForClerkUser(userId);
  await ensureOrgMember({
    orgId,
    userId,
    role: "admin",
    invitedBy: userId,
    status: "active",
  });
  await sendWelcomeOnce(userId, orgId);
  return orgId;
}
