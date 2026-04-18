import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";
import { appBaseUrl } from "@/lib/integrations/app-url";
import type { OrgCommitmentRow } from "@/lib/org-commitment-types";
import { getGmailIntegrationForOrg } from "@/lib/integrations/org-integrations-store";
import { getValidGmailAccessToken } from "@/lib/integrations/gmail-token";
import { getTeamsIntegrationForOrg } from "@/lib/integrations/zoom-teams-integration";
import { getValidTeamsAccessToken } from "@/lib/integrations/teams-token";
import {
  googleCalendarDeleteEvent,
  googleCalendarInsertEvent,
  googleCalendarPatchEvent,
  outlookCreateEvent,
  outlookDeleteEvent,
  outlookPatchEvent,
} from "@/lib/integrations/calendar-providers";

type CalRow = {
  id: string;
  commitmentId: string;
  provider: "google" | "outlook";
  calendarEventId: string;
  reminderEventId: string | null;
};

function commitmentLink(id: string): string {
  const base = appBaseUrl();
  return `${base}/workspace/commitments?id=${encodeURIComponent(id)}`;
}

function parseDay(iso: string): { start: string; end: string } {
  const day = iso.slice(0, 10);
  const d = new Date(`${day}T00:00:00.000Z`);
  const next = new Date(d.getTime() + 86400000);
  return { start: day, end: next.toISOString().slice(0, 10) };
}

function reminderDayBeforeDeadline(iso: string): { start: string; end: string } {
  const day = iso.slice(0, 10);
  const d = new Date(`${day}T12:00:00.000Z`);
  const rem = new Date(d.getTime() - 48 * 3600000);
  const rs = rem.toISOString().slice(0, 10);
  const re = new Date(rem.getTime() + 86400000).toISOString().slice(0, 10);
  return { start: rs, end: re };
}

async function loadRows(commitmentId: string): Promise<CalRow[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("calendar_deadline_events")
      .select("id, commitment_id, provider, calendar_event_id, reminder_event_id")
      .eq("commitment_id", commitmentId);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: String((r as { id: string }).id),
      commitmentId: String((r as { commitment_id: string }).commitment_id),
      provider: (r as { provider: string }).provider as "google" | "outlook",
      calendarEventId: String((r as { calendar_event_id: string }).calendar_event_id),
      reminderEventId:
        (r as { reminder_event_id: string | null }).reminder_event_id == null
          ? null
          : String((r as { reminder_event_id: string | null }).reminder_event_id),
    }));
  }
  const d = getSqliteHandle();
  const rows = d
    .prepare(
      `SELECT id, commitment_id, provider, calendar_event_id, reminder_event_id FROM calendar_deadline_events WHERE commitment_id = ?`
    )
    .all(commitmentId) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    commitmentId: String(r.commitment_id),
    provider: r.provider as "google" | "outlook",
    calendarEventId: String(r.calendar_event_id),
    reminderEventId: r.reminder_event_id == null ? null : String(r.reminder_event_id),
  }));
}

async function saveRow(params: {
  orgId: string;
  commitmentId: string;
  provider: "google" | "outlook";
  calendarEventId: string;
  reminderEventId: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: ex } = await supabase
      .from("calendar_deadline_events")
      .select("id")
      .eq("commitment_id", params.commitmentId)
      .eq("provider", params.provider)
      .maybeSingle();
    if (ex) {
      await supabase
        .from("calendar_deadline_events")
        .update({
          calendar_event_id: params.calendarEventId,
          reminder_event_id: params.reminderEventId,
          updated_at: now,
        })
        .eq("id", (ex as { id: string }).id);
      return;
    }
    await supabase.from("calendar_deadline_events").insert({
      id,
      org_id: params.orgId,
      commitment_id: params.commitmentId,
      provider: params.provider,
      calendar_event_id: params.calendarEventId,
      reminder_event_id: params.reminderEventId,
      created_at: now,
      updated_at: now,
    });
    return;
  }
  const d = getSqliteHandle();
  const existing = d
    .prepare(`SELECT id FROM calendar_deadline_events WHERE commitment_id = ? AND provider = ?`)
    .get(params.commitmentId, params.provider) as { id: string } | undefined;
  if (existing) {
    d.prepare(
      `UPDATE calendar_deadline_events SET calendar_event_id = ?, reminder_event_id = ?, updated_at = ? WHERE id = ?`
    ).run(params.calendarEventId, params.reminderEventId, now, existing.id);
  } else {
    d.prepare(
      `INSERT INTO calendar_deadline_events (id, org_id, commitment_id, provider, calendar_event_id, reminder_event_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      params.orgId,
      params.commitmentId,
      params.provider,
      params.calendarEventId,
      params.reminderEventId,
      now,
      now
    );
  }
}

async function deleteRowsLocal(commitmentId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    await supabase.from("calendar_deadline_events").delete().eq("commitment_id", commitmentId);
    return;
  }
  const d = getSqliteHandle();
  d.prepare(`DELETE FROM calendar_deadline_events WHERE commitment_id = ?`).run(commitmentId);
}

/** Sync Google + Outlook calendar events for a commitment deadline. */
export async function syncCalendarDeadlinesForCommitment(
  orgId: string,
  row: OrgCommitmentRow
): Promise<void> {
  const done = row.status === "completed" || row.deletedAt != null;
  const existing = await loadRows(row.id);

  const gmail = await getGmailIntegrationForOrg(orgId);
  const googleToken =
    gmail && gmail.status === "connected" && gmail.scope?.includes("calendar.events")
      ? await getValidGmailAccessToken(gmail)
      : null;

  const teams = await getTeamsIntegrationForOrg(orgId);
  const teamsToken =
    teams && teams.status === "connected" && teams.scope?.toLowerCase().includes("calendars")
      ? await getValidTeamsAccessToken(teams)
      : null;

  async function removeRemote() {
    for (const e of existing) {
      try {
        if (e.provider === "google" && googleToken) {
          await googleCalendarDeleteEvent(googleToken, e.calendarEventId);
          if (e.reminderEventId) await googleCalendarDeleteEvent(googleToken, e.reminderEventId);
        }
        if (e.provider === "outlook" && teamsToken) {
          await outlookDeleteEvent(teamsToken, e.calendarEventId);
          if (e.reminderEventId) await outlookDeleteEvent(teamsToken, e.reminderEventId);
        }
      } catch {
        /* best-effort */
      }
    }
    await deleteRowsLocal(row.id);
  }

  if (done) {
    await removeRemote();
    return;
  }

  const link = commitmentLink(row.id);
  const mainSummary = `Route5: ${row.title}`;
  const desc = [row.description?.trim() || "", "", link].filter(Boolean).join("\n");
  const day = parseDay(row.deadline);
  const rem = reminderDayBeforeDeadline(row.deadline);

  if (googleToken) {
    const g = existing.find((x) => x.provider === "google");
    if (!g) {
      const main = await googleCalendarInsertEvent(googleToken, {
        summary: mainSummary,
        description: desc,
        start: { date: day.start },
        end: { date: day.end },
      });
      const reminder = await googleCalendarInsertEvent(googleToken, {
        summary: `Route5 Reminder: ${row.title} (due soon)`,
        description: desc,
        start: { date: rem.start },
        end: { date: rem.end },
      });
      await saveRow({
        orgId,
        commitmentId: row.id,
        provider: "google",
        calendarEventId: main.id,
        reminderEventId: reminder.id,
      });
    } else {
      await googleCalendarPatchEvent(googleToken, g.calendarEventId, {
        summary: mainSummary,
        description: desc,
        start: { date: day.start },
        end: { date: day.end },
      });
      if (g.reminderEventId) {
        await googleCalendarPatchEvent(googleToken, g.reminderEventId, {
          summary: `Route5 Reminder: ${row.title} (due soon)`,
          description: desc,
          start: { date: rem.start },
          end: { date: rem.end },
        });
      }
    }
  }

  if (teamsToken) {
    const o = existing.find((x) => x.provider === "outlook");
    if (!o) {
      const main = await outlookCreateEvent(teamsToken, {
        subject: mainSummary,
        body: { contentType: "text", content: desc },
        start: { date: day.start },
        end: { date: day.end },
      });
      const reminder = await outlookCreateEvent(teamsToken, {
        subject: `Route5 Reminder: ${row.title} (due soon)`,
        body: { contentType: "text", content: desc },
        start: { date: rem.start },
        end: { date: rem.end },
      });
      await saveRow({
        orgId,
        commitmentId: row.id,
        provider: "outlook",
        calendarEventId: main.id,
        reminderEventId: reminder.id,
      });
    } else {
      await outlookPatchEvent(teamsToken, o.calendarEventId, {
        subject: mainSummary,
        body: { contentType: "text", content: desc },
        start: { date: day.start },
        end: { date: day.end },
      });
      if (o.reminderEventId) {
        await outlookPatchEvent(teamsToken, o.reminderEventId, {
          subject: `Route5 Reminder: ${row.title} (due soon)`,
          body: { contentType: "text", content: desc },
          start: { date: rem.start },
          end: { date: rem.end },
        });
      }
    }
  }
}
