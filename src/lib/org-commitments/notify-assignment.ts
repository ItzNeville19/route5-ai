import { sendNotification } from "@/lib/notifications/service";

function appBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "http://localhost:3000";
  return base.startsWith("http") ? base : `https://${base}`;
}

export async function notifyOrgCommitmentAssignment(params: {
  orgId: string;
  ownerClerkId: string;
  title: string;
  deadline: string;
  priority: string;
  commitmentId: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const link = `${appBaseUrl()}/workspace/commitments?id=${encodeURIComponent(params.commitmentId)}`;
  try {
    await sendNotification({
      orgId: params.orgId,
      userId: params.ownerClerkId,
      type: "commitment_assigned",
      title: `Commitment assigned: ${params.title.slice(0, 80)}`,
      body: `You were assigned a commitment. Deadline: ${params.deadline} · Priority: ${params.priority}`,
      metadata: {
        commitmentId: params.commitmentId,
        deadline: params.deadline,
        priority: params.priority,
        link,
      },
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "notify failed" };
  }
}
