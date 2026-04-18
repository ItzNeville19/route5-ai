import { clerkClient } from "@clerk/nextjs/server";
import { notionCreateComment, notionMarkPageDoneBestEffort, notionRetrievePage } from "@/lib/integrations/notion-api";
import { getNotionIntegrationForOrg } from "@/lib/integrations/org-integrations-store";
import { getNotionAccessToken } from "@/lib/integrations/notion-token";
import {
  getNotionCapturedByCommitmentId,
  insertNotionCompletedSync,
} from "@/lib/integrations/notion-store";

async function ownerDisplayName(ownerId: string): Promise<string> {
  try {
    const c = await clerkClient();
    const u = await c.users.getUser(ownerId);
    const fn = u.firstName;
    const ln = u.lastName;
    if (fn || ln) return [fn, ln].filter(Boolean).join(" ").trim();
    return u.username ?? u.primaryEmailAddress?.emailAddress ?? ownerId;
  } catch {
    return ownerId;
  }
}

/** Best-effort Notion sync when a commitment is completed — never throws. */
export async function maybeNotionWritebackOnCommitmentCompleted(params: {
  orgId: string;
  commitmentId: string;
  ownerId: string;
}): Promise<void> {
  try {
    const cap = await getNotionCapturedByCommitmentId(params.commitmentId, params.orgId);
    if (!cap) return;

    const integ = await getNotionIntegrationForOrg(params.orgId);
    if (!integ || integ.status !== "connected") return;

    const token = getNotionAccessToken(integ);
    if (!token) {
      await insertNotionCompletedSync({
        orgId: params.orgId,
        commitmentId: params.commitmentId,
        notionPageId: cap.notionPageId,
        syncStatus: "no_token",
      });
      return;
    }

    const page = await notionRetrievePage(token, cap.notionPageId);
    const props = page.properties as Record<string, unknown> | undefined;
    const mark = await notionMarkPageDoneBestEffort(token, cap.notionPageId, props);

    const who = await ownerDisplayName(params.ownerId);
    const when = new Date().toLocaleDateString(undefined, { dateStyle: "medium" });
    const comment = `Completed via Route5 on ${when} by ${who}`;
    const commentOk = await notionCreateComment(token, cap.notionPageId, comment);

    await insertNotionCompletedSync({
      orgId: params.orgId,
      commitmentId: params.commitmentId,
      notionPageId: cap.notionPageId,
      syncStatus: JSON.stringify({
        status: mark.ok ? "ok" : mark.detail,
        comment: commentOk ? "ok" : "comment_failed",
      }),
    });
  } catch (e) {
    console.error("notion writeback failed", e);
  }
}
