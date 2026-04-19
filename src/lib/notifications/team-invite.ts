import { sendNotificationToEmail } from "@/lib/notifications/service";

/** Call when a teammate is invited (e.g. Clerk org invitation created). */
export async function notifyTeamInvited(params: {
  orgId: string;
  inviteeEmail: string;
  inviterName: string;
  orgName: string;
  inviteUrl: string;
  /** Raw token — used by in-app notification deep links (always use /invite/[token]). */
  invitationToken: string;
}): Promise<void> {
  const subject = `You have been invited to join ${params.orgName} on Route5`;
  await sendNotificationToEmail({
    orgId: params.orgId,
    email: params.inviteeEmail,
    type: "team_invited",
    title: subject,
    body: `${params.inviterName} invited you to join ${params.orgName} on Route5. Open the link to review and join the workspace — shared projects appear in your Feed after you join.`,
    metadata: {
      inviterName: params.inviterName,
      orgName: params.orgName,
      inviteUrl: params.inviteUrl,
      invitationToken: params.invitationToken,
      link: params.inviteUrl,
    },
  });
}
