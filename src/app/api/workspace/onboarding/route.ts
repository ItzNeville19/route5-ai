import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { getOnboardingState, markOnboardingStepComplete, type OnboardingStep } from "@/lib/onboarding/progress-store";
import { getOrganizationProfile, updateOrganizationProfile } from "@/lib/workspace/organizations-update";
import { clerkClient } from "@clerk/nextjs/server";
import { notifyTeamInvited } from "@/lib/notifications/team-invite";
import { appBaseUrl } from "@/lib/integrations/app-url";
import {
  getGmailIntegrationForOrg,
  getNotionIntegrationForOrg,
  getSlackIntegrationForOrg,
} from "@/lib/integrations/org-integrations-store";
import { getZoomIntegrationForOrg } from "@/lib/integrations/zoom-teams-integration";
import { getTeamsIntegrationForOrg } from "@/lib/integrations/zoom-teams-integration";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await ensureOrganizationForClerkUser(userId);
  const state = await getOnboardingState(orgId, userId);
  const org = await getOrganizationProfile(orgId);
  return NextResponse.json({
    steps: state.steps,
    complete: state.fullyComplete,
    orgName: org.name,
    primaryUseCase: org.primaryUseCase,
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await ensureOrganizationForClerkUser(userId);
  let body: {
    action?: string;
    step?: OnboardingStep;
    orgName?: string;
    primaryUseCase?: string;
    emails?: string[];
    skipIntegration?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "org_setup") {
    await updateOrganizationProfile(orgId, {
      name: body.orgName?.trim() || undefined,
      primaryUseCase: body.primaryUseCase?.trim() ?? null,
    });
    await markOnboardingStepComplete(orgId, userId, "org_setup");
    return NextResponse.json({ ok: true });
  }

  if (body.action === "invite_team") {
    if (!body.emails?.length) {
      await markOnboardingStepComplete(orgId, userId, "invite_team");
      return NextResponse.json({ ok: true });
    }
    const org = await getOrganizationProfile(orgId);
    let inviterName = "A teammate";
    try {
      const c = await clerkClient();
      const u = await c.users.getUser(userId);
      inviterName =
        u.firstName ?? u.username ?? u.primaryEmailAddress?.emailAddress ?? inviterName;
    } catch {
      /* ignore */
    }
    const base = appBaseUrl();
    for (const raw of body.emails ?? []) {
      const email = raw.trim();
      if (!email.includes("@")) continue;
      const redirectAfter = `${base}/feed`;
      await notifyTeamInvited({
        orgId,
        inviteeEmail: email,
        inviterName,
        orgName: org.name,
        signupUrl: `${base}/sign-up?redirect_url=${encodeURIComponent(redirectAfter)}`,
      });
    }
    await markOnboardingStepComplete(orgId, userId, "invite_team");
    return NextResponse.json({ ok: true });
  }

  if (body.action === "connect_integration") {
    if (body.skipIntegration) {
      await markOnboardingStepComplete(orgId, userId, "connect_integration");
      return NextResponse.json({ ok: true });
    }
    const [slack, gmail, notion, zoom, teams] = await Promise.all([
      getSlackIntegrationForOrg(orgId),
      getGmailIntegrationForOrg(orgId),
      getNotionIntegrationForOrg(orgId),
      getZoomIntegrationForOrg(orgId),
      getTeamsIntegrationForOrg(orgId),
    ]);
    const connected =
      (slack?.status === "connected" ? 1 : 0) +
      (gmail?.status === "connected" ? 1 : 0) +
      (notion?.status === "connected" ? 1 : 0) +
      (zoom?.status === "connected" ? 1 : 0) +
      (teams?.status === "connected" ? 1 : 0);
    if (connected === 0) {
      return NextResponse.json({ error: "Connect at least one integration or skip." }, { status: 400 });
    }
    await markOnboardingStepComplete(orgId, userId, "connect_integration");
    return NextResponse.json({ ok: true });
  }

  if (body.action === "first_commitment") {
    await markOnboardingStepComplete(orgId, userId, "first_commitment");
    return NextResponse.json({ ok: true });
  }

  if (body.action === "complete") {
    await markOnboardingStepComplete(orgId, userId, "complete");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
