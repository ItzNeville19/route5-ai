import crypto from "node:crypto";
import { getSqliteHandle } from "@/lib/workspace/sqlite";
import { getServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { listOrganizationMembers } from "@/lib/workspace/org-members";
import { listProjectsForUser } from "@/lib/workspace/store";
import { listProjectMemberIds } from "@/lib/workspace/project-members";

export type ChatChannelType = "direct" | "project" | "group";

export type ChatChannelRow = {
  id: string;
  orgId: string;
  type: ChatChannelType;
  projectId: string | null;
  title: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  lastMessageAt: string | null;
  memberUserIds: string[];
};

export type ChatMessageRow = {
  id: string;
  channelId: string;
  orgId: string;
  userId: string;
  body: string;
  attachments: unknown[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

function uuid() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

type SqliteChannelRecord = {
  id: string;
  org_id: string;
  type: ChatChannelType;
  project_id: string | null;
  title: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type SqliteMessageRecord = {
  id: string;
  channel_id: string;
  org_id: string;
  user_id: string;
  body: string;
  attachments_json: string | null;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
};

function toChannel(
  row: SqliteChannelRecord & {
    unread_count?: number;
    last_message_at?: string | null;
    member_user_ids?: string[];
  }
): ChatChannelRow {
  return {
    id: row.id,
    orgId: row.org_id,
    type: row.type,
    projectId: row.project_id,
    title: row.title,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    unreadCount: Number(row.unread_count ?? 0),
    lastMessageAt: row.last_message_at ?? null,
    memberUserIds: row.member_user_ids ?? [],
  };
}

function toMessage(row: SqliteMessageRecord): ChatMessageRow {
  return {
    id: row.id,
    channelId: row.channel_id,
    orgId: row.org_id,
    userId: row.user_id,
    body: row.body,
    attachments: safeJson<unknown[]>(row.attachments_json, []),
    metadata: safeJson<Record<string, unknown>>(row.metadata_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function ensureProjectChannelsForUser(userId: string): Promise<void> {
  const orgId = await ensureOrganizationForClerkUser(userId);
  const projects = await listProjectsForUser(userId);
  for (const project of projects) {
    await ensureProjectChannel(orgId, project.id, project.name, userId);
  }
}

/** Ensures a project-scoped chat channel exists and memberships match project members. */
export async function ensureProjectChannel(
  orgId: string,
  projectId: string,
  title: string,
  actorUserId: string
): Promise<string> {
  const projectMemberIds = await listProjectMemberIds(projectId);
  const membersToJoin = [...new Set([actorUserId, ...projectMemberIds])];
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const existing = await supabase
      .from("chat_channels")
      .select("id")
      .eq("org_id", orgId)
      .eq("type", "project")
      .eq("project_id", projectId)
      .maybeSingle<{ id: string }>();
    const found = existing.data?.id;
    if (found) {
      for (const memberId of membersToJoin) {
        await upsertChatMembership(found, memberId);
      }
      await supabase
        .from("chat_channels")
        .update({ title: title.slice(0, 200), updated_at: nowIso() })
        .eq("id", found);
      return found;
    }
    const id = uuid();
    const now = nowIso();
    await supabase.from("chat_channels").insert({
      id,
      org_id: orgId,
      type: "project",
      project_id: projectId,
      title: title.slice(0, 200),
      created_by: actorUserId,
      created_at: now,
      updated_at: now,
    });
    for (const memberId of membersToJoin) {
      await upsertChatMembership(id, memberId);
    }
    return id;
  }
  const db = getSqliteHandle();
  const existing = db
    .prepare(
      `select id from chat_channels
       where org_id = ? and type = 'project' and project_id = ?
       limit 1`
    )
    .get(orgId, projectId) as { id: string } | undefined;
  if (existing?.id) {
    for (const memberId of membersToJoin) {
      db.prepare(
        `insert into chat_channel_members (id, channel_id, user_id, last_read_at, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?)
         on conflict(channel_id, user_id) do update set updated_at = excluded.updated_at`
      ).run(uuid(), existing.id, memberId, null, nowIso(), nowIso());
    }
    db.prepare(`update chat_channels set title = ?, updated_at = ? where id = ?`).run(
      title.slice(0, 200),
      nowIso(),
      existing.id
    );
    return existing.id;
  }
  const id = uuid();
  const now = nowIso();
  db.prepare(
    `insert into chat_channels (id, org_id, type, project_id, title, created_by, created_at, updated_at)
     values (?, ?, 'project', ?, ?, ?, ?, ?)`
  ).run(id, orgId, projectId, title.slice(0, 200), actorUserId, now, now);
  for (const memberId of membersToJoin) {
    db.prepare(
      `insert into chat_channel_members (id, channel_id, user_id, last_read_at, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?)`
    ).run(uuid(), id, memberId, null, now, now);
  }
  return id;
}

async function upsertChatMembership(channelId: string, userId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const now = nowIso();
    const supabase = getServiceClient();
    await supabase.from("chat_channel_members").upsert(
      {
        id: uuid(),
        channel_id: channelId,
        user_id: userId,
        updated_at: now,
      },
      { onConflict: "channel_id,user_id" }
    );
    return;
  }
  const db = getSqliteHandle();
  db.prepare(
    `insert into chat_channel_members (id, channel_id, user_id, last_read_at, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?)
     on conflict(channel_id, user_id) do update set updated_at = excluded.updated_at`
  ).run(uuid(), channelId, userId, null, nowIso(), nowIso());
}

export async function listChannelsForUser(userId: string): Promise<ChatChannelRow[]> {
  await ensureProjectChannelsForUser(userId);
  const orgId = await ensureOrganizationForClerkUser(userId);
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data: memberships } = await supabase
      .from("chat_channel_members")
      .select("channel_id,last_read_at")
      .eq("user_id", userId);
    const memberMap = new Map<string, string | null>();
    for (const row of memberships ?? []) {
      memberMap.set(String((row as { channel_id: string }).channel_id), (row as { last_read_at?: string | null }).last_read_at ?? null);
    }
    if (memberMap.size === 0) return [];
    const channelIds = [...memberMap.keys()];
    const { data: channels } = await supabase
      .from("chat_channels")
      .select("*")
      .eq("org_id", orgId)
      .in("id", channelIds)
      .order("updated_at", { ascending: false });
    const { data: members } = await supabase
      .from("chat_channel_members")
      .select("channel_id,user_id")
      .in("channel_id", channelIds);
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("channel_id,created_at,user_id")
      .eq("org_id", orgId)
      .in("channel_id", channelIds)
      .order("created_at", { ascending: false });
    const byChannel = new Map<string, { latest: string | null; count: number; readAt: string | null }>();
    for (const id of channelIds) {
      byChannel.set(id, { latest: null, count: 0, readAt: memberMap.get(id) ?? null });
    }
    for (const row of messages ?? []) {
      const channelId = String((row as { channel_id: string }).channel_id);
      const createdAt = String((row as { created_at: string }).created_at);
      const messageUserId = String((row as { user_id?: string }).user_id ?? "");
      const entry = byChannel.get(channelId);
      if (!entry) continue;
      if (!entry.latest) entry.latest = createdAt;
      if (messageUserId !== userId && (!entry.readAt || createdAt > entry.readAt)) entry.count += 1;
    }
    const memberIdsByChannel = new Map<string, string[]>();
    for (const row of members ?? []) {
      const channelId = String((row as { channel_id: string }).channel_id);
      const memberUserId = String((row as { user_id: string }).user_id);
      const list = memberIdsByChannel.get(channelId) ?? [];
      list.push(memberUserId);
      memberIdsByChannel.set(channelId, list);
    }
    return (channels ?? []).map((channel) => {
      const stats = byChannel.get(String((channel as { id: string }).id));
      return {
        id: String((channel as { id: string }).id),
        orgId: String((channel as { org_id: string }).org_id),
        type: String((channel as { type: ChatChannelType }).type) as ChatChannelType,
        projectId: ((channel as { project_id: string | null }).project_id ?? null) as string | null,
        title: String((channel as { title: string }).title),
        createdBy: String((channel as { created_by: string }).created_by),
        createdAt: String((channel as { created_at: string }).created_at),
        updatedAt: String((channel as { updated_at: string }).updated_at),
        unreadCount: stats?.count ?? 0,
        lastMessageAt: stats?.latest ?? null,
        memberUserIds: memberIdsByChannel.get(String((channel as { id: string }).id)) ?? [],
      };
    });
  }
  const db = getSqliteHandle();
  const rows = db
    .prepare(
      `select c.*,
              cm.last_read_at,
              (
                select max(m.created_at)
                from chat_messages m
                where m.channel_id = c.id
              ) as last_message_at,
              (
                select count(1)
                from chat_messages m2
                where m2.channel_id = c.id
                  and (cm.last_read_at is null or m2.created_at > cm.last_read_at)
              ) as unread_count
       from chat_channels c
       join chat_channel_members cm on cm.channel_id = c.id
       where c.org_id = ? and cm.user_id = ?
       order by coalesce(last_message_at, c.updated_at) desc`
    )
    .all(orgId, userId) as Array<SqliteChannelRecord & { unread_count: number; last_message_at: string | null }>;
  const withMembers = rows.map((row) => {
    const memberRows = db
      .prepare(`select user_id from chat_channel_members where channel_id = ?`)
      .all(row.id) as Array<{ user_id: string }>;
    return {
      ...row,
      member_user_ids: memberRows.map((memberRow) => memberRow.user_id),
    };
  });
  return withMembers.map((row) => toChannel(row));
}

export async function listMessagesForChannel(userId: string, channelId: string): Promise<ChatMessageRow[]> {
  const channel = await getChannelForUser(userId, channelId);
  if (!channel) return [];
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(400);
    const { data: hides } = await supabase
      .from("chat_message_hides")
      .select("message_id")
      .eq("user_id", userId);
    const hidden = new Set((hides ?? []).map((h) => String((h as { message_id: string }).message_id)));
    const rows = (data ?? []).filter((row) => !hidden.has(String((row as { id: string }).id)));
    return rows.map((row) => ({
      id: String((row as { id: string }).id),
      channelId: String((row as { channel_id: string }).channel_id),
      orgId: String((row as { org_id: string }).org_id),
      userId: String((row as { user_id: string }).user_id),
      body: String((row as { body: string }).body),
      attachments: (((row as { attachments_json?: unknown[] }).attachments_json as unknown[]) ?? []) as unknown[],
      metadata: (((row as { metadata_json?: Record<string, unknown> }).metadata_json as Record<string, unknown>) ?? {}) as Record<string, unknown>,
      createdAt: String((row as { created_at: string }).created_at),
      updatedAt: String((row as { updated_at: string }).updated_at),
    }));
  }
  const db = getSqliteHandle();
  const rows = db
    .prepare(
      `select m.*
       from chat_messages m
       where m.channel_id = ?
         and m.id not in (
           select message_id from chat_message_hides where user_id = ?
         )
       order by m.created_at asc
       limit 400`
    )
    .all(channelId, userId) as SqliteMessageRecord[];
  return rows.map(toMessage);
}

async function getChannelForUser(userId: string, channelId: string): Promise<ChatChannelRow | null> {
  const channels = await listChannelsForUser(userId);
  return channels.find((channel) => channel.id === channelId) ?? null;
}

export async function createDirectChannel(userId: string, targetUserId: string): Promise<ChatChannelRow | null> {
  if (!targetUserId || targetUserId === userId) return null;
  const orgId = await ensureOrganizationForClerkUser(userId);
  const members = await listOrganizationMembers(orgId);
  const userIds = new Set(members.map((m) => m.userId));
  if (!userIds.has(userId) || !userIds.has(targetUserId)) return null;
  const pairKey = [userId, targetUserId].sort().join(":");
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const existing = await supabase
      .from("chat_channels")
      .select("id")
      .eq("org_id", orgId)
      .eq("type", "direct")
      .eq("title", `dm:${pairKey}`)
      .maybeSingle<{ id: string }>();
    let channelId = existing.data?.id ?? null;
    if (!channelId) {
      channelId = uuid();
      const now = nowIso();
      await supabase.from("chat_channels").insert({
        id: channelId,
        org_id: orgId,
        type: "direct",
        project_id: null,
        title: `dm:${pairKey}`,
        created_by: userId,
        created_at: now,
        updated_at: now,
      });
    }
    await upsertChatMembership(channelId, userId);
    await upsertChatMembership(channelId, targetUserId);
  } else {
    const db = getSqliteHandle();
    const existing = db
      .prepare(`select id from chat_channels where org_id = ? and type = 'direct' and title = ? limit 1`)
      .get(orgId, `dm:${pairKey}`) as { id: string } | undefined;
    const channelId = existing?.id ?? uuid();
    if (!existing?.id) {
      const now = nowIso();
      db.prepare(
        `insert into chat_channels (id, org_id, type, project_id, title, created_by, created_at, updated_at)
         values (?, ?, 'direct', null, ?, ?, ?, ?)`
      ).run(channelId, orgId, `dm:${pairKey}`, userId, now, now);
    }
    db.prepare(
      `insert into chat_channel_members (id, channel_id, user_id, last_read_at, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?)
       on conflict(channel_id, user_id) do update set updated_at = excluded.updated_at`
    ).run(uuid(), channelId, userId, null, nowIso(), nowIso());
    db.prepare(
      `insert into chat_channel_members (id, channel_id, user_id, last_read_at, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?)
       on conflict(channel_id, user_id) do update set updated_at = excluded.updated_at`
    ).run(uuid(), channelId, targetUserId, null, nowIso(), nowIso());
  }
  const channels = await listChannelsForUser(userId);
  return channels.find((channel) => channel.title === `dm:${pairKey}`) ?? null;
}

export async function createGroupChannel(
  userId: string,
  title: string,
  memberUserIds: string[]
): Promise<ChatChannelRow | null> {
  if (!isSupabaseConfigured()) return null;
  const channelTitle = title.trim().slice(0, 200);
  if (!channelTitle) return null;
  const orgId = await ensureOrganizationForClerkUser(userId);
  const members = await listOrganizationMembers(orgId);
  const validMembers = new Set(members.map((member) => member.userId));
  const participants = [...new Set([userId, ...memberUserIds])]
    .filter((id) => validMembers.has(id))
    .slice(0, 40);
  if (participants.length < 2) return null;

  const channelId = uuid();
  const now = nowIso();
  const supabase = getServiceClient();
  await supabase.from("chat_channels").insert({
    id: channelId,
    org_id: orgId,
    type: "group",
    project_id: null,
    title: channelTitle,
    created_by: userId,
    created_at: now,
    updated_at: now,
  });
  for (const participant of participants) {
    await upsertChatMembership(channelId, participant);
  }
  const channels = await listChannelsForUser(userId);
  return channels.find((channel) => channel.id === channelId) ?? null;
}

export async function createChatMessage(
  userId: string,
  channelId: string,
  body: string,
  attachments: unknown[] = [],
  metadata: Record<string, unknown> = {}
): Promise<ChatMessageRow | null> {
  const channel = await getChannelForUser(userId, channelId);
  if (!channel) return null;
  const text = body.trim();
  if (!text) return null;
  const now = nowIso();
  const id = uuid();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const channelType: "direct" | "project" =
      channel.type === "direct" ? "direct" : "project";
    const { error: insertErr } = await supabase.from("chat_messages").insert({
      id,
      channel_id: channelId,
      channel_type: channelType,
      org_id: channel.orgId,
      sender_id: userId,
      user_id: userId,
      content: text.slice(0, 4000),
      body: text.slice(0, 4000),
      attachments: attachments,
      attachments_json: attachments,
      metadata_json: metadata,
      created_at: now,
      updated_at: now,
    });
    if (insertErr) throw insertErr;
    const { error: channelErr } = await supabase
      .from("chat_channels")
      .update({ updated_at: now })
      .eq("id", channelId);
    if (channelErr) throw channelErr;
  } else {
    const db = getSqliteHandle();
    db.prepare(
      `insert into chat_messages
       (id, org_id, channel_type, channel_id, sender_id, content, attachments, user_id, body, attachments_json, metadata_json, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      channel.orgId,
      channel.type === "direct" ? "direct" : "project",
      channelId,
      userId,
      text.slice(0, 4000),
      JSON.stringify(attachments ?? []),
      userId,
      text.slice(0, 4000),
      JSON.stringify(attachments ?? []),
      JSON.stringify(metadata ?? {}),
      now,
      now
    );
    db.prepare(`update chat_channels set updated_at = ? where id = ?`).run(now, channelId);
  }
  return {
    id,
    channelId,
    orgId: channel.orgId,
    userId,
    body: text.slice(0, 4000),
    attachments: attachments ?? [],
    metadata,
    createdAt: now,
    updatedAt: now,
  };
}

export async function markChannelRead(userId: string, channelId: string): Promise<void> {
  const channel = await getChannelForUser(userId, channelId);
  if (!channel) return;
  const now = nowIso();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    await supabase
      .from("chat_channel_members")
      .update({ last_read_at: now, updated_at: now })
      .eq("channel_id", channelId)
      .eq("user_id", userId);
    return;
  }
  const db = getSqliteHandle();
  db.prepare(
    `update chat_channel_members
     set last_read_at = ?, updated_at = ?
     where channel_id = ? and user_id = ?`
  ).run(now, now, channelId, userId);
}

export async function listChannelMemberIds(channelId: string): Promise<string[]> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data } = await supabase.from("chat_channel_members").select("user_id").eq("channel_id", channelId);
    return (data ?? []).map((row) => String((row as { user_id: string }).user_id));
  }
  const db = getSqliteHandle();
  const rows = db
    .prepare(`select user_id from chat_channel_members where channel_id = ?`)
    .all(channelId) as Array<{ user_id: string }>;
  return rows.map((row) => row.user_id);
}

async function getChatMessageForUser(
  userId: string,
  messageId: string
): Promise<{ message: ChatMessageRow; channel: ChatChannelRow } | null> {
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("chat_messages").select("*").eq("id", messageId).maybeSingle();
    if (error || !data) return null;
    const raw = data as Record<string, unknown>;
    const channelId = String(raw.channel_id);
    const channel = await getChannelForUser(userId, channelId);
    if (!channel) return null;
    const msgUser = String(raw.user_id ?? raw.sender_id ?? "");
    const message: ChatMessageRow = {
      id: String(raw.id),
      channelId,
      orgId: String(raw.org_id),
      userId: msgUser,
      body: String(raw.body ?? raw.content ?? ""),
      attachments: (raw.attachments_json as unknown[]) ?? (raw.attachments as unknown[]) ?? [],
      metadata: (raw.metadata_json as Record<string, unknown>) ?? {},
      createdAt: String(raw.created_at),
      updatedAt: String(raw.updated_at ?? raw.created_at),
    };
    return { message, channel };
  }
  const db = getSqliteHandle();
  const row = db.prepare(`select * from chat_messages where id = ?`).get(messageId) as
    | SqliteMessageRecord
    | undefined;
  if (!row) return null;
  const channel = await getChannelForUser(userId, row.channel_id);
  if (!channel) return null;
  return { message: toMessage(row), channel };
}

export async function updateChatMessage(
  userId: string,
  messageId: string,
  newBody: string
): Promise<ChatMessageRow | null> {
  const found = await getChatMessageForUser(userId, messageId);
  if (!found || found.message.userId !== userId) return null;
  const text = newBody.trim().slice(0, 4000);
  if (!text) return null;
  const now = nowIso();
  const meta = { ...found.message.metadata, edited: true };
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error } = await supabase
      .from("chat_messages")
      .update({
        body: text,
        content: text,
        metadata_json: meta,
        updated_at: now,
      })
      .eq("id", messageId)
      .eq("user_id", userId);
    if (error) return null;
    await supabase.from("chat_channels").update({ updated_at: now }).eq("id", found.message.channelId);
  } else {
    const db = getSqliteHandle();
    const r = db
      .prepare(
        `update chat_messages
         set body = ?, content = ?, metadata_json = ?, updated_at = ?
         where id = ? and user_id = ?`
      )
      .run(text, text, JSON.stringify(meta), now, messageId, userId);
    if (r.changes === 0) return null;
    db.prepare(`update chat_channels set updated_at = ? where id = ?`).run(now, found.message.channelId);
  }
  const next = await getChatMessageForUser(userId, messageId);
  return next?.message ?? null;
}

/** Hide a message from this user only (others still see it). */
export async function hideChatMessageForUser(userId: string, messageId: string): Promise<string | null> {
  const found = await getChatMessageForUser(userId, messageId);
  if (!found) return null;
  const channelId = found.message.channelId;
  const now = nowIso();
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error } = await supabase.from("chat_message_hides").insert({
      user_id: userId,
      message_id: messageId,
      created_at: now,
    });
    if (error && (error as { code?: string }).code !== "23505") return null;
    await supabase.from("chat_channels").update({ updated_at: now }).eq("id", channelId);
    return channelId;
  }
  const db = getSqliteHandle();
  db.prepare(
    `insert or ignore into chat_message_hides (user_id, message_id, created_at) values (?, ?, ?)`
  ).run(userId, messageId, now);
  db.prepare(`update chat_channels set updated_at = ? where id = ?`).run(now, channelId);
  return channelId;
}

/** Returns channel id on success (for realtime broadcast). */
export async function deleteChatMessage(userId: string, messageId: string): Promise<string | null> {
  const found = await getChatMessageForUser(userId, messageId);
  if (!found || found.message.userId !== userId) return null;
  const channelId = found.message.channelId;
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    const { error } = await supabase.from("chat_messages").delete().eq("id", messageId).eq("user_id", userId);
    if (error) return null;
    await supabase.from("chat_channels").update({ updated_at: nowIso() }).eq("id", channelId);
    return channelId;
  }
  const db = getSqliteHandle();
  const r = db
    .prepare(`delete from chat_messages where id = ? and user_id = ?`)
    .run(messageId, userId);
  if (r.changes === 0) return null;
  db.prepare(`update chat_channels set updated_at = ? where id = ?`).run(nowIso(), channelId);
  return channelId;
}

export async function addMembersToGroupChannel(
  userId: string,
  channelId: string,
  memberUserIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  const channel = await getChannelForUser(userId, channelId);
  if (!channel) return { ok: false, error: "Channel not found" };
  if (channel.type !== "group") {
    return { ok: false, error: "Only group conversations support adding people here." };
  }
  const orgId = await ensureOrganizationForClerkUser(userId);
  const orgMembers = await listOrganizationMembers(orgId);
  const valid = new Set(orgMembers.map((m) => m.userId));
  const toAdd = [...new Set(memberUserIds)].filter((id) => valid.has(id));
  if (toAdd.length === 0) return { ok: false, error: "Pick teammates from your organization." };
  const now = nowIso();
  for (const uid of toAdd) {
    await upsertChatMembership(channelId, uid);
  }
  if (isSupabaseConfigured()) {
    const supabase = getServiceClient();
    await supabase.from("chat_channels").update({ updated_at: now }).eq("id", channelId);
  } else {
    const db = getSqliteHandle();
    db.prepare(`update chat_channels set updated_at = ? where id = ?`).run(now, channelId);
  }
  return { ok: true };
}

