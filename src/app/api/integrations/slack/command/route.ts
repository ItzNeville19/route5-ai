import { NextResponse } from "next/server";
import { verifySlackRequest } from "@/lib/integrations/slack-verify";
import { getSlackIntegrationByTeamId } from "@/lib/integrations/org-integrations-store";
import { createOrgCommitmentAsOrgOwner } from "@/lib/org-commitments/repository";
import { computeLiveDashboardMetrics } from "@/lib/dashboard/compute";
import { fetchMetricRowsForOrg } from "@/lib/dashboard/store";
import { resolveOwnerDisplayNames } from "@/lib/dashboard/resolve-owners";
import { getOrganizationClerkUserId } from "@/lib/escalations/store";
import { appBaseUrl } from "@/lib/integrations/app-url";
import { broadcastOrgCommitmentEvent } from "@/lib/org-commitments/broadcast";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const ok = verifySlackRequest(
    rawBody,
    req.headers.get("x-slack-request-timestamp"),
    req.headers.get("x-slack-signature")
  );
  if (!ok) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const command = params.get("command")?.trim();
  const text = params.get("text")?.trim() ?? "";
  const teamId = params.get("team_id");

  if (command !== "/route5" || !teamId) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Unknown command.",
    });
  }

  const integration = await getSlackIntegrationByTeamId(teamId);
  if (!integration) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Route5 is not connected for this Slack workspace. Connect in Route5 → Integrations.",
    });
  }

  const orgId = integration.orgId;
  const owner = await getOrganizationClerkUserId(orgId);
  if (!owner) {
    return NextResponse.json({ response_type: "ephemeral", text: "Could not resolve org." });
  }

  const lower = text.toLowerCase();
  if (lower.startsWith("create ")) {
    const title = text.slice(7).trim() || "Untitled commitment";
    const deadline = new Date(Date.now() + 7 * 24 * 3600000).toISOString();
    try {
      const row = await createOrgCommitmentAsOrgOwner(orgId, {
        title: title.slice(0, 2000),
        description: "Created from Slack /route5",
        ownerId: owner,
        deadline,
        priority: "medium",
      });
      broadcastOrgCommitmentEvent(orgId, { kind: "commitment_created", id: row.id });
      const link = `${appBaseUrl()}/workspace/commitments?id=${encodeURIComponent(row.id)}`;
      return NextResponse.json({
        response_type: "in_channel",
        text: `Route5 commitment created: <${link}|${title.slice(0, 120)}>`,
      });
    } catch {
      return NextResponse.json({
        response_type: "ephemeral",
        text: "Could not create commitment.",
      });
    }
  }

  if (lower === "status" || lower.startsWith("status ")) {
    try {
      const rows = await fetchMetricRowsForOrg(orgId);
      const ownerIds = [...new Set(rows.map((r) => r.owner_id))];
      const names = await resolveOwnerDisplayNames(ownerIds);
      const m = computeLiveDashboardMetrics(rows, names);
      return NextResponse.json({
        response_type: "ephemeral",
        text: [
          `*Route5 execution health*`,
          `Health score: ${m.healthScore}`,
          `Active: ${m.activeCount} · On track: ${m.onTrackCount} · At risk: ${m.atRiskCount} · Overdue: ${m.overdueCount}`,
        ].join("\n"),
      });
    } catch {
      return NextResponse.json({
        response_type: "ephemeral",
        text: "Could not load metrics.",
      });
    }
  }

  return NextResponse.json({
    response_type: "ephemeral",
    text: "Try `/route5 create <title>` or `/route5 status`.",
  });
}
