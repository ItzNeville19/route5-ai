"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUser } from "@clerk/nextjs";
import { MessageSquare, Search, Send, Users, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useMemberDirectory } from "@/components/workspace/MemberProfilesProvider";

type ChatChannel = {
  id: string;
  orgId: string;
  type: "direct" | "project";
  projectId: string | null;
  title: string;
  unreadCount: number;
  lastMessageAt: string | null;
};

type ChatMessage = {
  id: string;
  channelId: string;
  userId: string;
  body: string;
  createdAt: string;
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
  const [query, setQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [orgMembers, setOrgMembers] = useState<
    Array<{ userId: string; name: string; email: string | null }>
  >([]);
  const [directTarget, setDirectTarget] = useState("");
  const { displayName: memberName } = useMemberDirectory();

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
      members?: Array<{ userId: string; name: string; email: string | null }>;
    };
    if (!res.ok) return;
    const next = (data.members ?? []).filter((m) => m.userId !== userId);
    setOrgMembers(next);
    if (!directTarget && next.length > 0) setDirectTarget(next[0].userId);
  }, [directTarget, userId]);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId]
  );

  const filteredChannels = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter((channel) => {
      const label = channel.type === "project" ? channel.title : memberName(dmPeerId(channel.title, userId) ?? "", userId, displayName);
      return label.toLowerCase().includes(q);
    });
  }, [channels, query, userId, memberName, displayName]);

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
    if (!selectedChannelId || !composer.trim()) return;
    const body = composer;
    setComposer("");
    await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        channelId: selectedChannelId,
        body,
      }),
    });
    await loadMessages(selectedChannelId);
    await loadChannels();
  }

  async function createDirect() {
    if (!directTarget) return;
    const res = await fetch("/api/chat/channels", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ targetUserId: directTarget }),
    });
    if (!res.ok) return;
    const data = (await res.json().catch(() => ({}))) as { channel?: ChatChannel };
    await loadChannels();
    if (data.channel?.id) setSelectedChannelId(data.channel.id);
  }

  const hasUnread = unreadCount > 0;

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
                className="fixed inset-y-0 right-0 z-[200] flex w-full max-w-[920px] flex-col border-l border-r5-border-subtle bg-r5-surface-primary/95 shadow-[var(--r5-shadow-elevated)] backdrop-blur-xl"
                role="dialog"
                aria-label="Workspace chat"
                aria-modal="true"
              >
                <header className="flex items-center justify-between border-b border-r5-border-subtle px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-r5-text-primary">Team chat</p>
                    <p className="text-xs text-r5-text-secondary">Direct messages and project channels</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-2 text-r5-text-secondary transition hover:bg-r5-surface-hover hover:text-r5-text-primary"
                    aria-label="Close chat panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </header>
                <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)]">
                  <section className="min-h-0 border-b border-r5-border-subtle md:border-b-0 md:border-r">
                    <div className="space-y-2 border-b border-r5-border-subtle p-3">
                      <label className="flex items-center gap-2 rounded-lg border border-r5-border-subtle bg-r5-surface-secondary/40 px-3 py-2 text-xs text-r5-text-secondary">
                        <Search className="h-3.5 w-3.5" />
                        <input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Search channels"
                          className="w-full bg-transparent text-sm text-r5-text-primary outline-none placeholder:text-r5-text-tertiary"
                        />
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={directTarget}
                          onChange={(event) => setDirectTarget(event.target.value)}
                          className="h-9 min-w-0 flex-1 rounded-md border border-r5-border-subtle bg-r5-surface-secondary/60 px-2 text-xs text-r5-text-primary"
                        >
                          {orgMembers.map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {member.name || member.email || member.userId}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => void createDirect()}
                          className="h-9 rounded-md border border-r5-border-subtle bg-r5-surface-hover px-3 text-xs font-medium text-r5-text-primary"
                        >
                          New DM
                        </button>
                      </div>
                    </div>
                    <div className="no-scrollbar min-h-0 space-y-1 overflow-y-auto p-2">
                      {loadingChannels && channels.length === 0 ? (
                        <p className="px-2 py-3 text-xs text-r5-text-secondary">Loading channels…</p>
                      ) : filteredChannels.length === 0 ? (
                        <p className="px-2 py-3 text-xs text-r5-text-secondary">No channels</p>
                      ) : (
                        filteredChannels.map((channel) => {
                          const peerId = dmPeerId(channel.title, userId);
                          const label =
                            channel.type === "project"
                              ? `# ${channel.title}`
                              : memberName(peerId ?? "", userId, displayName);
                          return (
                            <button
                              key={channel.id}
                              type="button"
                              onClick={() => setSelectedChannelId(channel.id)}
                              className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition ${
                                selectedChannelId === channel.id
                                  ? "bg-r5-surface-hover text-r5-text-primary"
                                  : "text-r5-text-secondary hover:bg-r5-surface-hover/60 hover:text-r5-text-primary"
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{label}</p>
                                <p className="text-xs text-r5-text-tertiary">{prettyTime(channel.lastMessageAt)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {channel.type === "project" ? (
                                  <Users className="h-3.5 w-3.5 text-r5-text-tertiary" />
                                ) : null}
                                {channel.unreadCount > 0 ? (
                                  <span className="rounded-full bg-r5-status-overdue px-2 py-0.5 text-[10px] font-semibold text-r5-text-primary">
                                    {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
                                  </span>
                                ) : null}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </section>
                  <section className="flex min-h-0 flex-col">
                    <div className="border-b border-r5-border-subtle px-4 py-3">
                      <p className="text-sm font-semibold text-r5-text-primary">
                        {selectedChannel
                          ? selectedChannel.type === "project"
                            ? `# ${selectedChannel.title}`
                            : memberName(dmPeerId(selectedChannel.title, userId) ?? "", userId, displayName)
                          : "Select a channel"}
                      </p>
                    </div>
                    <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
                      {loadingMessages ? (
                        <p className="text-sm text-r5-text-secondary">Loading messages…</p>
                      ) : messages.length === 0 ? (
                        <p className="text-sm text-r5-text-secondary">Start the conversation.</p>
                      ) : (
                        messages.map((message) => {
                          const mine = message.userId === userId;
                          return (
                            <article
                              key={message.id}
                              className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                                mine
                                  ? "ml-auto bg-r5-surface-hover text-r5-text-primary"
                                  : "bg-r5-surface-secondary/70 text-r5-text-primary"
                              }`}
                            >
                              {!mine ? (
                                <p className="mb-1 text-[11px] font-semibold text-r5-text-secondary">
                                  {memberName(message.userId, userId, displayName)}
                                </p>
                              ) : null}
                              <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>
                              <p className="mt-1 text-[10px] text-r5-text-tertiary">{prettyTime(message.createdAt)}</p>
                            </article>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    <footer className="border-t border-r5-border-subtle p-3">
                      <form
                        className="flex items-end gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void sendMessage();
                        }}
                      >
                        <textarea
                          value={composer}
                          onChange={(event) => setComposer(event.target.value)}
                          rows={2}
                          placeholder="Type a message…"
                          className="min-h-12 flex-1 resize-none rounded-lg border border-r5-border-subtle bg-r5-surface-secondary/50 px-3 py-2 text-sm text-r5-text-primary outline-none placeholder:text-r5-text-tertiary"
                        />
                        <button
                          type="submit"
                          disabled={!selectedChannelId || !composer.trim()}
                          className="inline-flex h-10 items-center gap-2 rounded-lg border border-r5-border-subtle bg-r5-surface-hover px-3 text-sm font-medium text-r5-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Send
                        </button>
                      </form>
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
