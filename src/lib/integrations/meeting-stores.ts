import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { getSqliteHandle } from "@/lib/workspace/sqlite";

export async function upsertZoomMeeting(params: {
  orgId: string;
  zoomMeetingId: string;
  zoomUserId?: string | null;
  topic?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  transcriptText?: string | null;
  transcriptFetched?: boolean;
  processed?: boolean;
  needsReview?: boolean;
  confidenceScore?: number | null;
  commitmentId?: string | null;
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: ex } = await supabase
      .from("zoom_meetings")
      .select("id")
      .eq("zoom_meeting_id", params.zoomMeetingId)
      .maybeSingle();
    if (ex) {
      const { error } = await supabase
        .from("zoom_meetings")
        .update({
          zoom_user_id: params.zoomUserId ?? null,
          topic: params.topic ?? null,
          start_time: params.startTime ?? null,
          end_time: params.endTime ?? null,
          transcript_text: params.transcriptText ?? null,
          transcript_fetched: params.transcriptFetched ?? false,
          processed: params.processed ?? false,
          needs_review: params.needsReview ?? false,
          confidence_score: params.confidenceScore ?? null,
          commitment_id: params.commitmentId ?? null,
        })
        .eq("id", (ex as { id: string }).id);
      if (error) throw error;
      return (ex as { id: string }).id;
    }
    const { data, error } = await supabase
      .from("zoom_meetings")
      .insert({
        id,
        org_id: params.orgId,
        zoom_meeting_id: params.zoomMeetingId,
        zoom_user_id: params.zoomUserId ?? null,
        topic: params.topic ?? null,
        start_time: params.startTime ?? null,
        end_time: params.endTime ?? null,
        transcript_text: params.transcriptText ?? null,
        transcript_fetched: params.transcriptFetched ?? false,
        processed: params.processed ?? false,
        needs_review: params.needsReview ?? false,
        confidence_score: params.confidenceScore ?? null,
        commitment_id: params.commitmentId ?? null,
        created_at: now,
      })
      .select("id")
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT id FROM zoom_meetings WHERE zoom_meeting_id = ?`)
    .get(params.zoomMeetingId) as { id: string } | undefined;
  if (row) {
    d.prepare(
      `UPDATE zoom_meetings SET zoom_user_id = ?, topic = ?, start_time = ?, end_time = ?,
       transcript_text = ?, transcript_fetched = ?, processed = ?, needs_review = ?, confidence_score = ?, commitment_id = ?
       WHERE id = ?`
    ).run(
      params.zoomUserId ?? null,
      params.topic ?? null,
      params.startTime ?? null,
      params.endTime ?? null,
      params.transcriptText ?? null,
      params.transcriptFetched ? 1 : 0,
      params.processed ? 1 : 0,
      params.needsReview ? 1 : 0,
      params.confidenceScore ?? null,
      params.commitmentId ?? null,
      row.id
    );
    return row.id;
  }
  d.prepare(
    `INSERT INTO zoom_meetings (id, org_id, zoom_meeting_id, zoom_user_id, topic, start_time, end_time, transcript_text, transcript_fetched, processed, needs_review, confidence_score, commitment_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.orgId,
    params.zoomMeetingId,
    params.zoomUserId ?? null,
    params.topic ?? null,
    params.startTime ?? null,
    params.endTime ?? null,
    params.transcriptText ?? null,
    params.transcriptFetched ? 1 : 0,
    params.processed ? 1 : 0,
    params.needsReview ? 1 : 0,
    params.confidenceScore ?? null,
    params.commitmentId ?? null,
    now
  );
  return id;
}

export async function countZoomMeetingsForOrg(orgId: string): Promise<{ processed: number; decisions: number }> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { count: p } = await supabase
      .from("zoom_meetings")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("processed", true);
    const { count: d } = await supabase
      .from("zoom_meetings")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .not("commitment_id", "is", null);
    return { processed: p ?? 0, decisions: d ?? 0 };
  }
  const d = getSqliteHandle();
  const pr = d
    .prepare(`SELECT count(*) as c FROM zoom_meetings WHERE org_id = ? AND processed = 1`)
    .get(orgId) as { c: number };
  const dc = d
    .prepare(`SELECT count(*) as c FROM zoom_meetings WHERE org_id = ? AND commitment_id IS NOT NULL`)
    .get(orgId) as { c: number };
  return { processed: pr.c, decisions: dc.c };
}

export async function upsertGmeetMeeting(params: {
  orgId: string;
  googleEventId: string;
  googleCalendarId?: string | null;
  summary?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  transcriptText?: string | null;
  transcriptFetched?: boolean;
  processed?: boolean;
  needsReview?: boolean;
  confidenceScore?: number | null;
  commitmentId?: string | null;
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: ex } = await supabase
      .from("gmeet_meetings")
      .select("id")
      .eq("google_event_id", params.googleEventId)
      .maybeSingle();
    if (ex) {
      await supabase
        .from("gmeet_meetings")
        .update({
          google_calendar_id: params.googleCalendarId ?? null,
          summary: params.summary ?? null,
          start_time: params.startTime ?? null,
          end_time: params.endTime ?? null,
          transcript_text: params.transcriptText ?? null,
          transcript_fetched: params.transcriptFetched ?? false,
          processed: params.processed ?? false,
          needs_review: params.needsReview ?? false,
          confidence_score: params.confidenceScore ?? null,
          commitment_id: params.commitmentId ?? null,
        })
        .eq("id", (ex as { id: string }).id);
      return (ex as { id: string }).id;
    }
    const { data, error } = await supabase
      .from("gmeet_meetings")
      .insert({
        id,
        org_id: params.orgId,
        google_event_id: params.googleEventId,
        google_calendar_id: params.googleCalendarId ?? null,
        summary: params.summary ?? null,
        start_time: params.startTime ?? null,
        end_time: params.endTime ?? null,
        transcript_text: params.transcriptText ?? null,
        transcript_fetched: params.transcriptFetched ?? false,
        processed: params.processed ?? false,
        needs_review: params.needsReview ?? false,
        confidence_score: params.confidenceScore ?? null,
        commitment_id: params.commitmentId ?? null,
        created_at: now,
      })
      .select("id")
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  }
  const d = getSqliteHandle();
  const row = d
    .prepare(`SELECT id FROM gmeet_meetings WHERE google_event_id = ?`)
    .get(params.googleEventId) as { id: string } | undefined;
  if (row) {
    d.prepare(
      `UPDATE gmeet_meetings SET google_calendar_id = ?, summary = ?, start_time = ?, end_time = ?,
       transcript_text = ?, transcript_fetched = ?, processed = ?, needs_review = ?, confidence_score = ?, commitment_id = ?
       WHERE id = ?`
    ).run(
      params.googleCalendarId ?? null,
      params.summary ?? null,
      params.startTime ?? null,
      params.endTime ?? null,
      params.transcriptText ?? null,
      params.transcriptFetched ? 1 : 0,
      params.processed ? 1 : 0,
      params.needsReview ? 1 : 0,
      params.confidenceScore ?? null,
      params.commitmentId ?? null,
      row.id
    );
    return row.id;
  }
  d.prepare(
    `INSERT INTO gmeet_meetings (id, org_id, google_event_id, google_calendar_id, summary, start_time, end_time, transcript_text, transcript_fetched, processed, needs_review, confidence_score, commitment_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.orgId,
    params.googleEventId,
    params.googleCalendarId ?? null,
    params.summary ?? null,
    params.startTime ?? null,
    params.endTime ?? null,
    params.transcriptText ?? null,
    params.transcriptFetched ? 1 : 0,
    params.processed ? 1 : 0,
    params.needsReview ? 1 : 0,
    params.confidenceScore ?? null,
    params.commitmentId ?? null,
    now
  );
  return id;
}

export async function countGmeetForOrg(orgId: string): Promise<{ processed: number; decisions: number }> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { count: p } = await supabase
      .from("gmeet_meetings")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("processed", true);
    const { count: d } = await supabase
      .from("gmeet_meetings")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .not("commitment_id", "is", null);
    return { processed: p ?? 0, decisions: d ?? 0 };
  }
  const d = getSqliteHandle();
  const pr = d
    .prepare(`SELECT count(*) as c FROM gmeet_meetings WHERE org_id = ? AND processed = 1`)
    .get(orgId) as { c: number };
  const dc = d
    .prepare(`SELECT count(*) as c FROM gmeet_meetings WHERE org_id = ? AND commitment_id IS NOT NULL`)
    .get(orgId) as { c: number };
  return { processed: pr.c, decisions: dc.c };
}

export async function insertTeamsCapturedMessage(params: {
  orgId: string;
  teamsMessageId: string;
  teamsChannelId: string;
  teamsTeamId: string;
  fromUserId?: string | null;
  fromDisplayName?: string | null;
  content: string;
  receivedAt: string;
  processed: boolean;
  decisionDetected: boolean;
  commitmentId?: string | null;
  confidenceScore?: number | null;
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error } = await supabase.from("teams_captured_messages").insert({
      id,
      org_id: params.orgId,
      teams_message_id: params.teamsMessageId,
      teams_channel_id: params.teamsChannelId,
      teams_team_id: params.teamsTeamId,
      from_user_id: params.fromUserId ?? null,
      from_display_name: params.fromDisplayName ?? null,
      content: params.content,
      received_at: params.receivedAt,
      processed: params.processed,
      decision_detected: params.decisionDetected,
      commitment_id: params.commitmentId ?? null,
      confidence_score: params.confidenceScore ?? null,
      captured_at: now,
    });
    if (error) throw error;
    return id;
  }
  const d = getSqliteHandle();
  d.prepare(
    `INSERT INTO teams_captured_messages (id, org_id, teams_message_id, teams_channel_id, teams_team_id, from_user_id, from_display_name, content, received_at, processed, decision_detected, commitment_id, confidence_score, captured_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.orgId,
    params.teamsMessageId,
    params.teamsChannelId,
    params.teamsTeamId,
    params.fromUserId ?? null,
    params.fromDisplayName ?? null,
    params.content,
    params.receivedAt,
    params.processed ? 1 : 0,
    params.decisionDetected ? 1 : 0,
    params.commitmentId ?? null,
    params.confidenceScore ?? null,
    now
  );
  return id;
}

export async function countTeamsForOrg(orgId: string): Promise<{ messages: number; decisions: number }> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { count: m } = await supabase
      .from("teams_captured_messages")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId);
    const { count: d } = await supabase
      .from("teams_captured_messages")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .not("commitment_id", "is", null);
    return { messages: m ?? 0, decisions: d ?? 0 };
  }
  const d = getSqliteHandle();
  const mc = d.prepare(`SELECT count(*) as c FROM teams_captured_messages WHERE org_id = ?`).get(orgId) as {
    c: number;
  };
  const dc = d
    .prepare(`SELECT count(*) as c FROM teams_captured_messages WHERE org_id = ? AND commitment_id IS NOT NULL`)
    .get(orgId) as { c: number };
  return { messages: mc.c, decisions: dc.c };
}
