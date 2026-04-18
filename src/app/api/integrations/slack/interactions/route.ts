import { NextResponse } from "next/server";
import { verifySlackRequest } from "@/lib/integrations/slack-verify";
import { slackApi } from "@/lib/integrations/slack-api";
import { getSlackIntegrationByTeamId, getSlackIntegrationForOrg } from "@/lib/integrations/org-integrations-store";
import { getSlackBotAccessToken } from "@/lib/integrations/slack-token";
import { snoozeEscalation, resolveEscalation, getEscalationByIdForOrg } from "@/lib/escalations/store";
import { getOrganizationClerkUserId } from "@/lib/escalations/store";
import { broadcastOrgDashboardEvent } from "@/lib/org-commitments/broadcast";

export const runtime = "nodejs";

type SlackPayload = {
  type?: string;
  team?: { id?: string };
  user?: { id?: string };
  trigger_id?: string;
  actions?: { action_id?: string; value?: string }[];
  view?: {
    callback_id?: string;
    private_metadata?: string;
    state?: { values?: Record<string, Record<string, { value?: string }>> };
  };
};

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
  let payload: SlackPayload;
  try {
    payload = JSON.parse(params.get("payload") || "{}");
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const teamId = payload.team?.id;
  if (!teamId) {
    return new NextResponse("", { status: 200 });
  }

  const integration = await getSlackIntegrationByTeamId(teamId);
  const token = integration ? getSlackBotAccessToken(integration) : null;

  if (payload.type === "block_actions" && payload.actions?.[0] && integration && token) {
    const act = payload.actions[0];
    let meta: { escalationId?: string; orgId?: string; commitmentId?: string };
    try {
      meta = JSON.parse(act.value || "{}");
    } catch {
      return NextResponse.json({ response_type: "ephemeral", text: "Invalid action." });
    }
    const escalationId = meta.escalationId;
    const orgId = meta.orgId;
    if (!escalationId || !orgId) {
      return NextResponse.json({ response_type: "ephemeral", text: "Missing escalation context." });
    }

    if (act.action_id === "route5_escalation_snooze") {
      const until = new Date(Date.now() + 24 * 3600000).toISOString();
      const row = await snoozeEscalation(escalationId, orgId, until, "Slack snooze (24h)");
      if (!row) {
        return NextResponse.json({ response_type: "ephemeral", text: "Could not snooze (already resolved?)." });
      }
      broadcastOrgDashboardEvent(orgId);
      return NextResponse.json({
        response_type: "ephemeral",
        text: "Escalation snoozed for 24 hours.",
      });
    }

    if (act.action_id === "route5_escalation_resolve_open" && payload.trigger_id) {
      await slackApi(token, "views.open", {
        trigger_id: payload.trigger_id,
        view: {
          type: "modal",
          callback_id: "route5_resolve_modal",
          private_metadata: JSON.stringify({ escalationId, orgId }),
          title: { type: "plain_text", text: "Resolve escalation" },
          submit: { type: "plain_text", text: "Resolve" },
          close: { type: "plain_text", text: "Cancel" },
          blocks: [
            {
              type: "input",
              block_id: "notes_block",
              element: {
                type: "plain_text_input",
                action_id: "resolution_notes",
                multiline: true,
              },
              label: { type: "plain_text", text: "Resolution notes" },
            },
          ],
        },
      });
      return new NextResponse("", { status: 200 });
    }
  }

  if (payload.type === "view_submission" && payload.view?.callback_id === "route5_resolve_modal") {
    let meta: { escalationId?: string; orgId?: string };
    try {
      meta = JSON.parse(payload.view.private_metadata || "{}");
    } catch {
      return NextResponse.json({ response_action: "clear" });
    }
    if (!meta.escalationId || !meta.orgId) {
      return NextResponse.json({ response_action: "clear" });
    }
    const integ = await getSlackIntegrationForOrg(meta.orgId);
    if (!integ || integ.status !== "connected") {
      return NextResponse.json({ response_action: "clear" });
    }
    const owner = await getOrganizationClerkUserId(meta.orgId);
    if (!owner) {
      return NextResponse.json({
        response_action: "errors",
        errors: { notes_block: "Org error" },
      });
    }
    const notes =
      payload.view.state?.values?.notes_block?.resolution_notes?.value?.trim() ?? "";
    if (!notes) {
      return NextResponse.json({
        response_action: "errors",
        errors: { notes_block: "Resolution notes are required." },
      });
    }
    const esc = await getEscalationByIdForOrg(meta.escalationId, meta.orgId);
    if (!esc || esc.resolvedAt) {
      return NextResponse.json({ response_action: "clear" });
    }
    await resolveEscalation(meta.escalationId, meta.orgId, owner, notes);
    broadcastOrgDashboardEvent(meta.orgId);
    return NextResponse.json({ response_action: "clear" });
  }

  return new NextResponse("", { status: 200 });
}
