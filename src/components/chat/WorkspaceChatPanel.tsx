"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUser } from "@clerk/nextjs";
import {
  AtSign,
  Hash,
  Maximize2,
  MessageSquare,
  Minimize2,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useMemberDirectory } from "@/components/workspace/MemberProfilesProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";

type ChatChannel = {
  id: string;
  orgId: string;
  type: "direct" | "project" | "group";
  projectId: string | null;
  title: string;
  unreadCount: number;
  lastMessageAt: string | null;
  memberUserIds: string[];
};

type ChatMessage = {
  id: string;
  channelId: string;
  userId: string;
  body: string;
  attachments?: Array<{
    id: string;
    name: string;
    mimeType?: string;
    size?: number;
  }>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
};

function dmPeerId(title: string, selfId: string): string | null {
  if (!title.startsWith("dm:")) return null;
  const pair = title.slice(3).split(":");
  if (pair.length !== 2) return null;
  return pair[0] === selfId ? pair[1] : pair[0] === pair[1] ? null : pair[0];
}

function prettyTime(iso: string | null): string {
  if (!iso) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return "now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  return `${Math.floor(diffSec / 86400)}d`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function sameCalendarDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function bubbleTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function compareChannelsRecent(a: ChatChannel, b: ChatChannel): number {
  const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
  const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
  return tb - ta;
}

const CHAT_FULLSCREEN_KEY = "route5:chat-fullscreen:v1";

function ChannelCategory({ label }: { label: string }) {
  return (
    <div className="px-2 pb-0.5 pt-3 first:pt-1">
      <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#949ba4]">{label}</p>
    </div>
  );
}

export default function WorkspaceChatPanel() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const displayName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "You";
  const rootRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composer, setComposer] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    Array<{ id: string; name: string; mimeType?: string; size?: number }>
  >([]);
  const [query, setQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [orgMembers, setOrgMembers] = useState<
    Array<{ userId: string; name: string; email: string | null }>
  >([]);
  const [directTarget, setDirectTarget] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [sidebarCreateOpen, setSidebarCreateOpen] = useState(false);
  /** Full viewport vs compact slide-over from the right — persisted */
  const [chatFullscreen, setChatFullscreen] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  /** Touch / pinned-open: show edit & trash without hover */
  const [openToolbarMessageId, setOpenToolbarMessageId] = useState<string | null>(null);
  const [deleteMenuMessageId, setDeleteMenuMessageId] = useState<string | null>(null);
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
  const [addPeopleIds, setAddPeopleIds] = useState<string[]>([]);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const addPeopleRef = useRef<HTMLDivElement>(null);
  const { displayName: memberName } = useMemberDirectory();
  const { pushToast } = useWorkspaceExperience();

  useEffect(() => {
    try {
      const v = localStorage.getItem(CHAT_FULLSCREEN_KEY);
      if (v === "0") setChatFullscreen(false);
      else if (v === "1") setChatFullscreen(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (openToolbarMessageId === null && deleteMenuMessageId === null) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest("[data-chat-bubble]")) {
        setOpenToolbarMessageId(null);
        setDeleteMenuMessageId(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [openToolbarMessageId, deleteMenuMessageId]);

  const toggleChatFullscreen = useCallback(() => {
    setChatFullscreen((f) => {
      const next = !f;
      try {
        localStorage.setItem(CHAT_FULLSCREEN_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const loadChannels = useCallback(async () => {
    if (!userId) return;
    setLoadingChannels(true);
    try {
      const res = await fetch("/api/chat/channels", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { channels?: ChatChannel[] };
      if (!res.ok) return;
      const next = data.channels ?? [];
      setChannels(next);
      const totalUnread = next.reduce((acc, channel) => acc + Math.max(0, channel.unreadCount || 0), 0);
      setUnreadCount(totalUnread);
      if (!selectedChannelId && next.length > 0) {
        setSelectedChannelId(next[0].id);
      }
    } finally {
      setLoadingChannels(false);
    }
  }, [selectedChannelId, userId]);

  const loadMembers = useCallback(async () => {
    const res = await fetch("/api/workspace/organization", { credentials: "same-origin" });
    const data = (await res.json().catch(() => ({}))) as {
      members?: Array<{
        userId: string;
        displayName?: string;
        profile?: {
          firstName?: string | null;
          lastName?: string | null;
          username?: string | null;
          primaryEmail?: string | null;
        };
      }>;
    };
    if (!res.ok) return;
    const next = (data.members ?? [])
      .filter((m) => m.userId !== userId)
      .map((m) => {
        const p = m.profile;
        const fromProfile =
          [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim() ||
          p?.username?.trim() ||
          p?.primaryEmail?.split("@")[0]?.trim();
        const name = (m.displayName ?? fromProfile ?? "Teammate").trim();
        return {
          userId: m.userId,
          name,
          email: p?.primaryEmail ?? null,
        };
      });
    setOrgMembers(next);
    if (!directTarget && next.length > 0) setDirectTarget(next[0].userId);
    if (groupMemberIds.length === 0 && next.length > 0) {
      setGroupMemberIds([next[0].userId]);
    }
  }, [directTarget, userId, groupMemberIds.length]);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId]
  );

  const filteredChannels = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter((channel) => {
      const label =
        channel.type === "project"
          ? channel.title
          : channel.type === "group"
            ? channel.title
            : memberName(dmPeerId(channel.title, userId) ?? "", userId, displayName);
      return label.toLowerCase().includes(q);
    });
  }, [channels, query, userId, memberName, displayName]);

  const channelsByKind = useMemo(() => {
    const projects = filteredChannels.filter((c) => c.type === "project").sort(compareChannelsRecent);
    const groups = filteredChannels.filter((c) => c.type === "group").sort(compareChannelsRecent);
    const dms = filteredChannels.filter((c) => c.type === "direct").sort(compareChannelsRecent);
    return { projects, groups, dms };
  }, [filteredChannels]);

  useEffect(() => {
    if (!sidebarCreateOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setSidebarCreateOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sidebarCreateOpen]);

  useEffect(() => {
    if (!addPeopleOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (addPeopleRef.current && !addPeopleRef.current.contains(e.target as Node)) {
        setAddPeopleOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [addPeopleOpen]);

  const loadMessages = useCallback(async (channelId: string) => {
    if (!channelId) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/messages?channelId=${encodeURIComponent(channelId)}`, {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { messages?: ChatMessage[] };
      if (!res.ok) return;
      setMessages(data.messages ?? []);
      setChannels((prev) =>
        prev.map((channel) => (channel.id === channelId ? { ...channel, unreadCount: 0 } : channel))
      );
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (!selectedChannelId) return;
    void loadMessages(selectedChannelId);
  }, [selectedChannelId, loadMessages]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  useEffect(() => {
    if (!userId) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const unreadChannel = client.channel(`chat:unread:${userId}`);
    unreadChannel.on("broadcast", { event: "unread" }, () => {
      void loadChannels();
    });
    unreadChannel.subscribe();
    return () => {
      void client.removeChannel(unreadChannel);
    };
  }, [userId, loadChannels]);

  useEffect(() => {
    if (!open || !selectedChannelId) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const channel = client.channel(`chat:channel:${selectedChannelId}`);
    channel.on("broadcast", { event: "message" }, () => {
      void loadMessages(selectedChannelId);
      void loadChannels();
    });
    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [open, selectedChannelId, loadMessages, loadChannels]);

  useEffect(() => {
    const openPanel = () => setOpen(true);
    window.addEventListener("route5:chat-open", openPanel);
    return () => window.removeEventListener("route5:chat-open", openPanel);
  }, []);

  async function sendMessage() {
    if (!selectedChannelId || (!composer.trim() && pendingAttachments.length === 0)) return;
    const body = composer;
    const attachmentsSnapshot = pendingAttachments;
    const optimisticId = `pending-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      channelId: selectedChannelId,
      userId,
      body: body.trim() || "[attachment]",
      attachments: attachmentsSnapshot,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setComposer("");
    setPendingAttachments([]);
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        channelId: selectedChannelId,
        body,
        attachments: attachmentsSnapshot,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      pushToast(data.error ?? "Message could not be sent.", "error");
      setComposer(body);
      setPendingAttachments(attachmentsSnapshot);
      return;
    }
    await loadMessages(selectedChannelId);
    await loadChannels();
  }

  const saveMessageEdit = useCallback(async () => {
    if (!editingMessageId || !editDraft.trim()) return;
    const res = await fetch(`/api/chat/messages/${encodeURIComponent(editingMessageId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ body: editDraft.trim() }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      pushToast(data.error ?? "Could not save edit.", "error");
      return;
    }
    setEditingMessageId(null);
    setEditDraft("");
    if (selectedChannelId) await loadMessages(selectedChannelId);
  }, [editingMessageId, editDraft, selectedChannelId, loadMessages, pushToast]);

  const deleteMessageAtScope = useCallback(
    async (messageId: string, scope: "self" | "all") => {
      const res = await fetch(`/api/chat/messages/${encodeURIComponent(messageId)}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ scope }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        pushToast(data.error ?? "Could not delete.", "error");
        return;
      }
      setDeleteMenuMessageId(null);
      setOpenToolbarMessageId(null);
      if (selectedChannelId) await loadMessages(selectedChannelId);
      await loadChannels();
    },
    [selectedChannelId, loadMessages, loadChannels, pushToast]
  );

  const submitAddPeople = useCallback(async () => {
    if (!selectedChannelId || addPeopleIds.length === 0) return;
    const res = await fetch(`/api/chat/channels/${encodeURIComponent(selectedChannelId)}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ userIds: addPeopleIds }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      pushToast(data.error ?? "Could not add people.", "error");
      return;
    }
    pushToast("People added.", "success");
    setAddPeopleOpen(false);
    setAddPeopleIds([]);
    await loadChannels();
    await loadMessages(selectedChannelId);
  }, [selectedChannelId, addPeopleIds, pushToast, loadChannels, loadMessages]);

  async function createDirect() {
    if (!directTarget) {
      pushToast("Add teammates in Organization first, or pick someone from the list.", "info");
      return;
    }
    const res = await fetch("/api/chat/channels", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ type: "direct", targetUserId: directTarget }),
    });
    const data = (await res.json().catch(() => ({}))) as { channel?: ChatChannel; error?: string };
    if (!res.ok) {
      pushToast(data.error ?? "Could not open DM.", "error");
      return;
    }
    await loadChannels();
    if (data.channel?.id) setSelectedChannelId(data.channel.id);
  }

  async function createGroup() {
    if (!groupTitle.trim()) {
      pushToast("Enter a group name (e.g. Marketing, HR).", "info");
      return;
    }
    if (groupMemberIds.length === 0) {
      pushToast("Select at least one teammate for the group.", "info");
      return;
    }
    const res = await fetch("/api/chat/channels", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        type: "group",
        title: groupTitle.trim(),
        memberUserIds: groupMemberIds,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { channel?: ChatChannel; error?: string };
    if (!res.ok) {
      pushToast(data.error ?? "Could not create group.", "error");
      return;
    }
    await loadChannels();
    if (data.channel?.id) {
      setSelectedChannelId(data.channel.id);
      setGroupTitle("");
    }
  }

  const hasUnread = unreadCount > 0;

  const renderChannelRow = (channel: ChatChannel) => {
    const peerId = dmPeerId(channel.title, userId);
    const label =
      channel.type === "project"
        ? channel.title
        : channel.type === "group"
          ? channel.title
          : memberName(peerId ?? "", userId, displayName);
    const Icon = channel.type === "direct" ? AtSign : Hash;
    const selected = selectedChannelId === channel.id;
    return (
      <button
        key={channel.id}
        type="button"
        onClick={() => setSelectedChannelId(channel.id)}
        className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[13px] transition ${
          selected
            ? "bg-[#3f4248] text-white"
            : "text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
        <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
        <span className="shrink-0 text-[11px] tabular-nums text-[#949ba4]">
          {prettyTime(channel.lastMessageAt)}
        </span>
        {channel.unreadCount > 0 ? (
          <span className="shrink-0 rounded-full bg-[#f23f43] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary/90 p-[var(--r5-space-2)] text-r5-text-secondary shadow-[var(--r5-shadow-elevated)] transition-[background-color,color] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:bg-r5-surface-hover hover:text-r5-text-primary"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open team chat"
      >
        <MessageSquare className="h-4 w-4" strokeWidth={2} aria-hidden />
        {hasUnread ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-[var(--r5-radius-pill)] bg-r5-status-overdue px-[var(--r5-space-1)] text-[length:var(--r5-font-kbd)] font-semibold text-r5-text-primary">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[199] bg-black/40"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
              />
              <aside
                className={`fixed z-[200] flex flex-col bg-[#1c1c1e] shadow-[var(--r5-shadow-elevated)] backdrop-blur-xl ${
                  chatFullscreen
                    ? "inset-0 h-[100dvh] w-full max-w-none border-0"
                    : "inset-y-0 right-0 w-[min(100vw,480px)] border-l border-white/10 sm:w-[min(100vw,520px)] md:w-[min(100vw,560px)]"
                }`}
                role="dialog"
                aria-label="Workspace chat"
                aria-modal="true"
              >
                <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#2c2c2e]/90 px-3 py-2 backdrop-blur-md md:px-4 md:py-2.5">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold leading-tight text-white">Messages</p>
                    <p className="mt-0.5 hidden text-[11px] text-white/50 sm:block">
                      {chatFullscreen
                        ? "Fullscreen — use the button to dock as a side panel."
                        : "Docked panel — expand for fullscreen."}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={toggleChatFullscreen}
                      className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                      aria-pressed={chatFullscreen}
                      title={chatFullscreen ? "Dock panel" : "Fullscreen"}
                      aria-label={chatFullscreen ? "Use docked side panel" : "Use fullscreen"}
                    >
                      {chatFullscreen ? (
                        <Minimize2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                      ) : (
                        <Maximize2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                      aria-label="Close chat panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </header>
                <div
                  className={`grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] md:grid-rows-1 ${
                    chatFullscreen
                      ? "md:grid-cols-[minmax(200px,min(280px,26vw))_minmax(0,1fr)]"
                      : "md:grid-cols-[minmax(196px,220px)_minmax(0,1fr)]"
                  }`}
                >
                  <section className="relative flex min-h-0 flex-col border-b border-black/30 bg-[#2b2d31] md:h-full md:border-b-0 md:border-r md:border-black/30">
                    <div className="flex shrink-0 items-center gap-1.5 border-b border-black/20 px-2 py-2">
                      <label className="flex min-w-0 flex-1 items-center gap-2 rounded bg-[#1e1f22] px-2.5 py-1.5 text-xs text-[#949ba4]">
                        <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                        <input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Search channels"
                          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#dbdee1] outline-none placeholder:text-[#6d7178]"
                        />
                      </label>
                      <div className="relative shrink-0" ref={createMenuRef}>
                        <button
                          type="button"
                          onClick={() => setSidebarCreateOpen((o) => !o)}
                          className="flex h-8 w-8 items-center justify-center rounded bg-[#1e1f22] text-[#dbdee1] transition hover:bg-[#35373c]"
                          aria-expanded={sidebarCreateOpen}
                          aria-label="Create channel or DM"
                        >
                          <Plus className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                        {sidebarCreateOpen ? (
                          <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[min(100vw-2rem,280px)] rounded-lg border border-black/40 bg-[#111214] p-3 shadow-xl">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#949ba4]">
                              Direct message
                            </p>
                            <div className="flex gap-2">
                              <select
                                value={directTarget}
                                onChange={(event) => setDirectTarget(event.target.value)}
                                className="min-w-0 flex-1 rounded border border-white/10 bg-[#2b2d31] px-2 py-2 text-[12px] text-[#dbdee1]"
                              >
                                {orgMembers.length === 0 ? (
                                  <option value="">No teammates</option>
                                ) : (
                                  orgMembers.map((member) => (
                                    <option key={member.userId} value={member.userId}>
                                      {member.name || member.email || member.userId}
                                    </option>
                                  ))
                                )}
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  void createDirect();
                                  setSidebarCreateOpen(false);
                                }}
                                className="shrink-0 rounded bg-[#5865f2] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#4752c4]"
                              >
                                Go
                              </button>
                            </div>
                            <div className="my-3 border-t border-white/10" />
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#949ba4]">
                              New group
                            </p>
                            <input
                              value={groupTitle}
                              onChange={(event) => setGroupTitle(event.target.value)}
                              placeholder="Group name"
                              className="mb-2 w-full rounded border border-white/10 bg-[#2b2d31] px-2 py-2 text-[12px] text-[#dbdee1] placeholder:text-[#6d7178]"
                            />
                            <div className="mb-2 max-h-28 space-y-1 overflow-y-auto rounded border border-white/5 bg-[#1e1f22] p-1.5">
                              {orgMembers.map((member) => {
                                const checked = groupMemberIds.includes(member.userId);
                                return (
                                  <label
                                    key={`group-${member.userId}`}
                                    className="flex min-h-7 cursor-pointer items-center gap-2 rounded px-1.5 text-[11px] text-[#b5bac1]"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(event) =>
                                        setGroupMemberIds((prev) =>
                                          event.target.checked
                                            ? [...new Set([...prev, member.userId])]
                                            : prev.filter((id) => id !== member.userId)
                                        )
                                      }
                                      className="rounded border-white/20"
                                    />
                                    <span className="truncate">
                                      {member.name || member.email || member.userId}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                void createGroup();
                                setSidebarCreateOpen(false);
                              }}
                              className="w-full rounded bg-[#248046] py-2 text-[12px] font-semibold text-white hover:bg-[#1f6e3b]"
                            >
                              Create group
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div
                      className={`no-scrollbar overflow-y-auto px-1.5 pb-2 pt-1 md:max-h-none md:flex-1 md:min-h-0 ${
                        chatFullscreen
                          ? "max-h-[min(420px,52vh)]"
                          : "max-h-[min(300px,46vh)]"
                      }`}
                    >
                      {loadingChannels && channels.length === 0 ? (
                        <p className="px-2 py-4 text-center text-[12px] text-[#949ba4]">Loading channels…</p>
                      ) : filteredChannels.length === 0 ? (
                        <p className="px-2 py-4 text-center text-[12px] text-[#949ba4]">
                          {query.trim() ? "No matches" : "No channels yet — use + to start a DM or group"}
                        </p>
                      ) : (
                        <>
                          {channelsByKind.projects.length > 0 ? (
                            <>
                              <ChannelCategory label="Project channels" />
                              <div className="space-y-0.5 px-0.5">
                                {channelsByKind.projects.map((ch) => renderChannelRow(ch))}
                              </div>
                            </>
                          ) : null}
                          {channelsByKind.groups.length > 0 ? (
                            <>
                              <ChannelCategory label="Groups" />
                              <div className="space-y-0.5 px-0.5">
                                {channelsByKind.groups.map((ch) => renderChannelRow(ch))}
                              </div>
                            </>
                          ) : null}
                          {channelsByKind.dms.length > 0 ? (
                            <>
                              <ChannelCategory label="Direct messages" />
                              <div className="space-y-0.5 px-0.5">
                                {channelsByKind.dms.map((ch) => renderChannelRow(ch))}
                              </div>
                            </>
                          ) : null}
                        </>
                      )}
                    </div>
                  </section>
                  <section className="flex min-h-0 flex-col bg-[#000]">
                    <div className="relative flex min-h-[44px] items-center justify-center border-b border-white/10 bg-[#2c2c2e]/90 px-4 py-2.5 backdrop-blur-md">
                      <p className="text-center text-[13px] font-semibold text-white">
                        {selectedChannel
                          ? selectedChannel.type === "project" || selectedChannel.type === "group"
                            ? selectedChannel.title
                            : memberName(dmPeerId(selectedChannel.title, userId) ?? "", userId, displayName)
                          : "Messages"}
                      </p>
                      {selectedChannel?.type === "group" ? (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2" ref={addPeopleRef}>
                          <button
                            type="button"
                            onClick={() => {
                              setAddPeopleOpen((o) => !o);
                              setAddPeopleIds([]);
                            }}
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/10 px-2 text-[11px] font-semibold text-white hover:bg-white/15"
                            aria-expanded={addPeopleOpen}
                            title="Add people to this group"
                          >
                            <UserPlus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                            <span className="hidden sm:inline">Add people</span>
                          </button>
                          {addPeopleOpen ? (
                            <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[min(100vw-2rem,280px)] rounded-lg border border-black/40 bg-[#111214] p-3 shadow-xl">
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#949ba4]">
                                Add teammates
                              </p>
                              <div className="mb-2 max-h-32 space-y-1 overflow-y-auto rounded border border-white/5 bg-[#1e1f22] p-1.5">
                                {orgMembers
                                  .filter((m) => !(selectedChannel.memberUserIds ?? []).includes(m.userId))
                                  .map((member) => {
                                    const checked = addPeopleIds.includes(member.userId);
                                    return (
                                      <label
                                        key={`add-${member.userId}`}
                                        className="flex min-h-7 cursor-pointer items-center gap-2 rounded px-1.5 text-[11px] text-[#b5bac1]"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(event) =>
                                            setAddPeopleIds((prev) =>
                                              event.target.checked
                                                ? [...new Set([...prev, member.userId])]
                                                : prev.filter((id) => id !== member.userId)
                                            )
                                          }
                                          className="rounded border-white/20"
                                        />
                                        <span className="truncate">
                                          {member.name || member.email || member.userId}
                                        </span>
                                      </label>
                                    );
                                  })}
                              </div>
                              {orgMembers.filter(
                                (m) => !(selectedChannel.memberUserIds ?? []).includes(m.userId)
                              ).length === 0 ? (
                                <p className="text-[11px] text-[#949ba4]">Everyone is already here.</p>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void submitAddPeople()}
                                  disabled={addPeopleIds.length === 0}
                                  className="w-full rounded bg-[#5865f2] py-2 text-[12px] font-semibold text-white hover:bg-[#4752c4] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Add to group
                                </button>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2">
                      {loadingMessages ? (
                        <p className="py-8 text-center text-[13px] text-white/45">Loading messages…</p>
                      ) : messages.length === 0 ? (
                        <p className="py-8 text-center text-[13px] text-white/45">No messages yet</p>
                      ) : (
                        <div className="space-y-1">
                          {messages.map((message, index) => {
                            const mine = message.userId === userId;
                            const prev = index > 0 ? messages[index - 1] : null;
                            const showDay = !prev || !sameCalendarDay(prev.createdAt, message.createdAt);
                            const showTail =
                              !mine &&
                              (!prev ||
                                prev.userId !== message.userId ||
                                !sameCalendarDay(prev.createdAt, message.createdAt));
                            const pending = message.id.startsWith("pending-");
                            const canEdit =
                              mine && message.body !== "[attachment]" && !pending;
                            const canHideForSelf = !pending;
                            const canDeleteForAll = mine && !pending;
                            const showMessageTools = canEdit || canHideForSelf;
                            const toolbarOpen = openToolbarMessageId === message.id;
                            return (
                              <div key={message.id}>
                                {showDay ? (
                                  <div className="my-4 flex justify-center">
                                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/55">
                                      {dayLabel(message.createdAt)}
                                    </span>
                                  </div>
                                ) : null}
                                <article
                                  className={`flex w-full flex-col ${mine ? "items-end" : "items-start"}`}
                                >
                                  {!mine && showTail ? (
                                    <p className="mb-0.5 max-w-[75%] pl-1 text-[11px] font-semibold text-white/45">
                                      {memberName(message.userId, userId, displayName)}
                                    </p>
                                  ) : null}
                                  <div
                                    data-chat-bubble
                                    className={`max-w-[75%] rounded-[1.25rem] px-3.5 py-2 text-[15px] leading-snug shadow-sm ${
                                      mine
                                        ? "rounded-br-md bg-[#0A84FF] text-white"
                                        : "rounded-bl-md bg-[#3a3a3c] text-white"
                                    } group/message relative`}
                                    onClick={
                                      editingMessageId === message.id && mine
                                        ? undefined
                                        : (e) => {
                                            if ((e.target as HTMLElement).closest("button")) return;
                                            setOpenToolbarMessageId((prev) =>
                                              prev === message.id ? null : message.id
                                            );
                                            setDeleteMenuMessageId(null);
                                          }
                                    }
                                  >
                                    {editingMessageId === message.id && mine ? (
                                      <div className="space-y-2">
                                        <textarea
                                          value={editDraft}
                                          onChange={(e) => setEditDraft(e.target.value)}
                                          rows={3}
                                          className="w-full min-w-[200px] resize-y rounded-lg border border-white/25 bg-black/25 px-2 py-1.5 text-[14px] text-white outline-none placeholder:text-white/40"
                                        />
                                        <div className="flex justify-end gap-2">
                                          <button
                                            type="button"
                                            className="rounded-md px-2 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10"
                                            onClick={() => {
                                              setEditingMessageId(null);
                                              setEditDraft("");
                                            }}
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            className="rounded-md bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/30"
                                            onClick={() => void saveMessageEdit()}
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        {message.body !== "[attachment]" ? (
                                          <p className="whitespace-pre-wrap">{message.body}</p>
                                        ) : null}
                                        {message.attachments && message.attachments.length > 0 ? (
                                          <div className="mt-2 space-y-1">
                                            {message.attachments.map((attachment) => (
                                              <div
                                                key={attachment.id}
                                                className={`rounded-lg px-2 py-1.5 text-[12px] ${
                                                  mine
                                                    ? "bg-white/15 text-white/95"
                                                    : "bg-black/25 text-white/85"
                                                }`}
                                              >
                                                <span className="font-medium">{attachment.name}</span>
                                                {typeof attachment.size === "number"
                                                  ? ` · ${Math.max(1, Math.round(attachment.size / 1024))} KB`
                                                  : ""}
                                              </div>
                                            ))}
                                          </div>
                                        ) : null}
                                        {showMessageTools ? (
                                          <div
                                            className={`mt-1.5 flex justify-end gap-0.5 border-t border-white/10 pt-1.5 transition-opacity duration-150 ${
                                              toolbarOpen
                                                ? "opacity-100"
                                                : "pointer-events-none opacity-0 group-hover/message:pointer-events-auto group-hover/message:opacity-100"
                                            } ${mine ? "" : "justify-start"}`}
                                          >
                                            <div className="relative flex items-center gap-0.5">
                                              {canEdit ? (
                                                <button
                                                  type="button"
                                                  className="rounded p-1 text-white/85 hover:bg-white/15"
                                                  title="Edit message"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteMenuMessageId(null);
                                                    setEditingMessageId(message.id);
                                                    setEditDraft(message.body);
                                                  }}
                                                >
                                                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                                                </button>
                                              ) : null}
                                              {canHideForSelf ? (
                                                <button
                                                  type="button"
                                                  className="rounded p-1 text-white/85 hover:bg-white/15"
                                                  title="Delete message"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteMenuMessageId((m) =>
                                                      m === message.id ? null : message.id
                                                    );
                                                  }}
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                                                </button>
                                              ) : null}
                                              {deleteMenuMessageId === message.id ? (
                                                <div
                                                  className={`absolute bottom-full z-20 mb-1 flex min-w-[11rem] flex-col overflow-hidden rounded-lg border border-white/15 bg-[#2c2c2e] py-1 text-left shadow-lg ${
                                                    mine ? "right-0" : "left-0"
                                                  }`}
                                                  onClick={(e) => e.stopPropagation()}
                                                  role="menu"
                                                >
                                                  <button
                                                    type="button"
                                                    role="menuitem"
                                                    className="px-3 py-2 text-left text-[12px] font-medium text-white/90 hover:bg-white/10"
                                                    onClick={() =>
                                                      void deleteMessageAtScope(message.id, "self")
                                                    }
                                                  >
                                                    Delete for you
                                                  </button>
                                                  {canDeleteForAll ? (
                                                    <button
                                                      type="button"
                                                      role="menuitem"
                                                      className="px-3 py-2 text-left text-[12px] font-medium text-white/90 hover:bg-white/10"
                                                      onClick={() =>
                                                        void deleteMessageAtScope(message.id, "all")
                                                      }
                                                    >
                                                      Delete for everyone
                                                    </button>
                                                  ) : null}
                                                </div>
                                              ) : null}
                                            </div>
                                          </div>
                                        ) : null}
                                        <p
                                          className={`mt-1 text-right text-[10px] ${
                                            mine ? "text-white/70" : "text-white/45"
                                          }`}
                                        >
                                          {bubbleTime(message.createdAt)}
                                          {message.metadata?.edited ? (
                                            <span className="ml-1.5 opacity-80">(edited)</span>
                                          ) : null}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                </article>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    <footer className="border-t border-white/10 bg-[#1c1c1e] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                      <form
                        className="flex items-end gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void sendMessage();
                        }}
                      >
                        <label className="mb-0.5 inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#0A84FF] transition hover:bg-white/5">
                          <span className="sr-only">Attach</span>
                          <span className="text-xl leading-none" aria-hidden>
                            +
                          </span>
                          <input
                            type="file"
                            className="sr-only"
                            multiple
                            onChange={(event) => {
                              const files = Array.from(event.target.files ?? []);
                              if (files.length === 0) return;
                              setPendingAttachments((prev) =>
                                [
                                  ...prev,
                                  ...files.slice(0, 8).map((file) => ({
                                    id: crypto.randomUUID(),
                                    name: file.name.slice(0, 260),
                                    mimeType: file.type || "application/octet-stream",
                                    size: file.size,
                                  })),
                                ].slice(0, 8)
                              );
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                        <div className="flex min-h-[44px] flex-1 items-end rounded-[22px] border border-white/12 bg-[#2c2c2e] px-3 py-1.5">
                          <textarea
                            value={composer}
                            onChange={(event) => setComposer(event.target.value)}
                            rows={1}
                            placeholder="Message"
                            className="max-h-32 min-h-[28px] w-full resize-none bg-transparent py-1.5 text-[15px] text-white outline-none placeholder:text-white/35"
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                void sendMessage();
                              }
                            }}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={
                            !selectedChannelId || (!composer.trim() && pendingAttachments.length === 0)
                          }
                          className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0A84FF] text-white shadow-md transition hover:bg-[#409cff] disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/35"
                          aria-label="Send"
                        >
                          <Send className="h-4 w-4" strokeWidth={2.2} />
                        </button>
                      </form>
                      {pendingAttachments.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5 px-1">
                          {pendingAttachments.map((attachment) => (
                            <button
                              key={attachment.id}
                              type="button"
                              onClick={() =>
                                setPendingAttachments((prev) =>
                                  prev.filter((item) => item.id !== attachment.id)
                                )
                              }
                              className="rounded-full border border-white/15 bg-[#2c2c2e] px-2.5 py-1 text-[11px] text-white/70"
                            >
                              {attachment.name} ×
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </footer>
                  </section>
                </div>
              </aside>
            </>,
            document.body
          )
        : null}
    </div>
  );
}
