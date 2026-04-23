import { sendNotification } from "@/lib/notifications/service";
import { appBaseUrl } from "@/lib/app-base-url";

/** In-app / email / Slack for project-scoped commitments — deep-links to Capture/Desk. */
export async function notifyProjectDeskAssignment(params: {
  orgId: string;
  ownerClerkId: string;
  title: string;
  projectId: string;
  commitmentId: string;
  dueLabel: string;
  priority: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const link = `${appBaseUrl()}/desk?projectId=${encodeURIComponent(params.projectId)}`;
  try {
    await sendNotification({
      orgId: params.orgId,
      userId: params.ownerClerkId,
      type: "commitment_assigned",
      title: `Commitment assigned: ${params.title.slice(0, 80)}`,
      body: `You have a new commitment on Desk. Due: ${params.dueLabel} · Priority: ${params.priority}`,
      metadata: {
        commitmentId: params.commitmentId,
        projectId: params.projectId,
        deadline: params.dueLabel,
        priority: params.priority,
        link,
      },
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "notify failed" };
  }
}

export async function notifyOrgCommitmentAssignment(params: {
  orgId: string;
  ownerClerkId: string;
  title: string;
  deadline: string;
  priority: string;
  commitmentId: string;
  description?: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const link = `${appBaseUrl()}/workspace/commitments?id=${encodeURIComponent(params.commitmentId)}`;
  try {
    const detail = params.description?.trim();
    const excerpt = detail ? detail.replace(/\s+/g, " ").slice(0, 180) : null;
    await sendNotification({
      orgId: params.orgId,
      userId: params.ownerClerkId,
      type: "commitment_assigned",
      title: `Commitment assigned: ${params.title.slice(0, 80)}`,
      body: `You were assigned a commitment. Deadline: ${params.deadline} · Priority: ${params.priority}${excerpt ? ` · Brief: ${excerpt}` : ""}`,
      metadata: {
        commitmentId: params.commitmentId,
        deadline: params.deadline,
        priority: params.priority,
        brief: excerpt,
        link,
      },
      forceChannels: { inApp: true, email: true },
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "notify failed" };
  }
}
