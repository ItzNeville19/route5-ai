import {
  notionFetchAllBlocksPlainText,
  notionQueryDatabase,
  pageTitleFromProperties,
  type NotionPageObject,
} from "@/lib/integrations/notion-api";
import {
  getNotionIntegrationForOrg,
  listConnectedNotionIntegrations,
  touchNotionIntegrationUsed,
} from "@/lib/integrations/org-integrations-store";
import { getNotionAccessToken } from "@/lib/integrations/notion-token";
import {
  listNotionWatchedDatabases,
  updateNotionWatchedPollState,
} from "@/lib/integrations/notion-store";
import { processNotionCapturedContent } from "@/lib/integrations/notion-process-page";

function iso(d: Date): string {
  return d.toISOString();
}

export async function pollNotionForOrg(orgId: string): Promise<{ pages: number; errors: number }> {
  let pages = 0;
  let errors = 0;
  const integ = await getNotionIntegrationForOrg(orgId);
  if (!integ || integ.status !== "connected") return { pages: 0, errors: 0 };
  const token = getNotionAccessToken(integ);
  if (!token) return { pages: 0, errors: 1 };

  await touchNotionIntegrationUsed(orgId);

  const watched = await listNotionWatchedDatabases(orgId);
  const active = watched.filter((w) => w.watching);

  for (const db of active) {
    const since = db.lastPolledAt
      ? new Date(db.lastPolledAt)
      : new Date(Date.now() - 24 * 3600000);
    const sinceIso = iso(since);
    let cursor: string | undefined;
    try {
      for (;;) {
        const q = await notionQueryDatabase(token, db.notionDatabaseId, {
          sinceIso,
          startCursor: cursor,
        });
        for (const page of q.results) {
          try {
            await processOnePage(token, orgId, db.notionDatabaseId, page);
            pages++;
          } catch {
            errors++;
          }
        }
        if (!q.has_more || !q.next_cursor) break;
        cursor = q.next_cursor ?? undefined;
      }
      await updateNotionWatchedPollState(orgId, db.notionDatabaseId, {
        lastPolledAt: iso(new Date()),
        lastCursor: null,
      });
    } catch {
      errors++;
    }
  }

  return { pages, errors };
}

async function processOnePage(
  token: string,
  orgId: string,
  databaseId: string,
  page: NotionPageObject
): Promise<void> {
  const pageId = page.id;
  const title = pageTitleFromProperties(page);
  const url = page.url ?? null;
  const createdTime = page.created_time ?? null;
  const lastEdited = page.last_edited_time ?? null;
  const body = await notionFetchAllBlocksPlainText(token, pageId);
  await processNotionCapturedContent({
    orgId,
    notionPageId: pageId,
    notionDatabaseId: databaseId,
    title,
    contentText: body,
    pageUrl: url,
    createdTime,
    lastEditedTime: lastEdited,
  });
}

export async function pollAllConnectedNotionOrgs(): Promise<{
  orgs: number;
  pages: number;
  errors: number;
}> {
  const rows = await listConnectedNotionIntegrations();
  let pages = 0;
  let errors = 0;
  for (const r of rows) {
    const res = await pollNotionForOrg(r.orgId);
    pages += res.pages;
    errors += res.errors;
  }
  return { orgs: rows.length, pages, errors };
}
