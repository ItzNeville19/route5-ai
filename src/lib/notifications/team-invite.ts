import { sendNotificationToEmail } from "@/lib/notifications/service";

/** Call when a teammate is invited (e.g. Clerk org invitation created). */
export async function notifyTeamInvited(params: {
  orgId: string;
  inviteeEmail: string;
  inviterName: string;
  orgName: string;
  signupUrl: string;
}): Promise<void> {
  await sendNotificationToEmail({
    orgId: params.orgId,
    email: params.inviteeEmail,
    type: "team_invited",
    title: `You're invited to ${params.orgName}`,
    body: `${params.inviterName} invited you to join ${params.orgName} on Route5.`,
    metadata: {
      inviterName: params.inviterName,
      orgName: params.orgName,
      signupUrl: params.signupUrl,
      link: params.signupUrl,
    },
  });
}
