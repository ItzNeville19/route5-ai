import { clerkClient } from "@clerk/nextjs/server";
import { sendOperationalEmail } from "@/lib/notify-resend";

function appBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "http://localhost:3000";
  return base.startsWith("http") ? base : `https://${base}`;
}

export async function notifyOrgCommitmentAssignment(params: {
  ownerClerkId: string;
  title: string;
  deadline: string;
  priority: string;
  commitmentId: string;
}): Promise<{ sent: boolean; reason?: string }> {
  let email: string | null = null;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(params.ownerClerkId);
    email = user.primaryEmailAddress?.emailAddress ?? null;
  } catch {
    return { sent: false, reason: "Could not resolve owner email" };
  }
  if (!email) {
    return { sent: false, reason: "Owner has no primary email" };
  }
  const link = `${appBaseUrl()}/workspace/commitments?id=${encodeURIComponent(params.commitmentId)}`;
  return sendOperationalEmail({
    to: email,
    subject: `[Route5] Commitment assigned: ${params.title.slice(0, 80)}`,
    text: [
      "You were assigned a commitment in Route5.",
      "",
      `Title: ${params.title}`,
      `Deadline: ${params.deadline}`,
      `Priority: ${params.priority}`,
      "",
      `Open: ${link}`,
    ].join("\n"),
  });
}
