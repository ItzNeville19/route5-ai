import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { clerkClient } from "@clerk/nextjs/server";
import { listAllOrganizationIds, fetchOrganizationName } from "@/lib/dashboard/store";
import { getOrganizationClerkUserId } from "@/lib/escalations/store";
import { hasMorningDigestForLocalDate } from "@/lib/notifications/store";
import { sendNotification } from "@/lib/notifications/service";
import { listOrgCommitmentsForOrgId } from "@/lib/org-commitments/repository";
import type { OrgCommitmentRow } from "@/lib/org-commitment-types";
import { appBaseUrl } from "@/lib/app-base-url";

export const runtime = "nodejs";

function localTimeParts(now: Date, timeZone?: string): { hour: number; minute: number } | null {
  const tz = timeZone?.trim();
  if (!tz) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "NaN");
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "NaN");
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return { hour, minute };
  } catch {
    return null;
  }
}

function dateKeyInTimezone(now: Date, timeZone?: string): string {
  const tz = timeZone?.trim();
  if (!tz) return now.toISOString().slice(0, 10);
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

function isDueToday(commitment: OrgCommitmentRow, todayKey: string): boolean {
  const key = commitment.deadline.slice(0, 10);
  return key === todayKey && commitment.status !== "completed";
}

function isOverdue(commitment: OrgCommitmentRow, nowIso: string): boolean {
  if (commitment.status === "completed") return false;
  if (commitment.status === "overdue") return true;
  return commitment.deadline < nowIso;
}

function isAtRisk(commitment: OrgCommitmentRow): boolean {
  return commitment.status === "at_risk";
}

function pickMostImportant(rows: OrgCommitmentRow[]): OrgCommitmentRow | null {
  if (!rows[0]) return null;
  const priorityRank: Record<OrgCommitmentRow["priority"], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return [...rows].sort((a, b) => {
    const overdueBoostA = a.status === "overdue" ? -1 : 0;
    const overdueBoostB = b.status === "overdue" ? -1 : 0;
    if (overdueBoostA !== overdueBoostB) return overdueBoostA - overdueBoostB;
    if (priorityRank[a.priority] !== priorityRank[b.priority]) {
      return priorityRank[a.priority] - priorityRank[b.priority];
    }
    return a.deadline.localeCompare(b.deadline);
  })[0] ?? null;
}

function readWorkspaceTimezoneFromUser(user: { privateMetadata?: unknown }): string | undefined {
  const meta = user.privateMetadata as Record<string, unknown> | undefined;
  const prefs = (meta?.route5WorkspacePrefs ?? null) as Record<string, unknown> | null;
  const tz = prefs?.workspaceTimezone;
  return typeof tz === "string" && tz.trim() ? tz.trim() : undefined;
}

/**
 * Daily morning digest cron.
 * Vercel schedule should run at least every 10 minutes (see vercel.json) so each workspace timezone
 * hits the local 8:00 hour while deduping to one send per local calendar day (see metadata.morningDigestLocalDate).
 * Requires RESEND_API_KEY, CRON_SECRET, and user email prefs (email on for "Morning digest").
 */
export async function GET(req: Request) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let outOfWindow = 0;

  try {
    const now = new Date();
    const nowIso = now.toISOString();
    const orgIds = await listAllOrganizationIds();
    const clerk = await clerkClient();

    for (const orgId of orgIds) {
      const ownerUserId = await getOrganizationClerkUserId(orgId);
      if (!ownerUserId) {
        skipped++;
        continue;
      }

      let user: Awaited<ReturnType<typeof clerk.users.getUser>>;
      try {
        user = await clerk.users.getUser(ownerUserId);
      } catch {
        failed++;
        continue;
      }

      const workspaceTimezone = readWorkspaceTimezoneFromUser(user);
      const local = localTimeParts(now, workspaceTimezone);
      // Full 8:00–8:59 local hour; idempotency via hasMorningDigestForLocalDate (cron runs every ~10 min).
      if (!local || local.hour !== 8) {
        outOfWindow++;
        continue;
      }

      const { rows } = await listOrgCommitmentsForOrgId(orgId, {
        owner: ownerUserId,
        limit: 500,
        offset: 0,
        sort: "deadline",
        order: "asc",
      });
      if (rows.length === 0) {
        skipped++;
        continue;
      }

      const todayKey = dateKeyInTimezone(now, workspaceTimezone);
      if (await hasMorningDigestForLocalDate({ orgId, userId: ownerUserId, localDateKey: todayKey })) {
        skipped++;
        continue;
      }
      const dueToday = rows.filter((r) => isDueToday(r, todayKey));
      const overdue = rows.filter((r) => isOverdue(r, nowIso));
      const atRisk = rows.filter((r) => isAtRisk(r) && !isOverdue(r, nowIso));
      const focus = pickMostImportant(rows.filter((r) => r.status !== "completed"));
      const topAttention = [...rows]
        .filter((r) => r.status !== "completed")
        .sort((a, b) => {
          const overdueA = a.status === "overdue" ? 0 : 1;
          const overdueB = b.status === "overdue" ? 0 : 1;
          if (overdueA !== overdueB) return overdueA - overdueB;
          const riskA = a.status === "at_risk" ? 0 : 1;
          const riskB = b.status === "at_risk" ? 0 : 1;
          if (riskA !== riskB) return riskA - riskB;
          return a.deadline.localeCompare(b.deadline);
        })
        .slice(0, 3);
      const overdueNames = overdue.slice(0, 3).map((item) => item.title);

      const orgName = await fetchOrganizationName(orgId);
      const title = `Your day: ${dueToday.length} commitment${dueToday.length === 1 ? "" : "s"} due today`;
      const body = [
        `Workspace: ${orgName}`,
        overdueNames.length > 0
          ? `Overdue: ${overdue.length} (${overdueNames.join(" · ")}).`
          : `Overdue: ${overdue.length}.`,
        `At risk this week: ${atRisk.length}.`,
        topAttention.length > 0
          ? `Top attention: ${topAttention.map((row) => row.title).join(" · ")}.`
          : "Top attention: none.",
        focus
          ? `Most important: ${focus.title} (due ${new Date(focus.deadline).toLocaleDateString()}).`
          : "Most important: No active commitments.",
      ].join("\n");
      const link = `${appBaseUrl()}/desk?filter=mine`;

      try {
        await sendNotification({
          orgId,
          userId: ownerUserId,
          type: "daily_morning_digest",
          title,
          body,
          metadata: {
            morningDigestLocalDate: todayKey,
            orgName,
            dueTodayCount: dueToday.length,
            overdueCount: overdue.length,
            atRiskCount: atRisk.length,
            topAttention: topAttention.map((row) => ({
              id: row.id,
              title: row.title,
              deadline: row.deadline,
              priority: row.priority,
            })),
            focusCommitmentId: focus?.id ?? null,
            focusCommitmentTitle: focus?.title ?? null,
            link,
          },
        });
        sent++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      ok: true,
      orgs: orgIds.length,
      digestsSent: sent,
      skipped,
      outOfWindow,
      failed,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
