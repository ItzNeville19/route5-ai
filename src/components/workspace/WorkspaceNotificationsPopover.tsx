"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BarChart2,
  Bell,
  Clock,
  CreditCard,
  Hourglass,
  Info,
  Mail,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { useI18n } from "@/components/i18n/I18nProvider";
import { buildDailyDigestListItems } from "@/lib/workspace-daily-digest";
import {
  digestFingerprint,
  isDigestUnread,
  markDigestFingerprintSeen,
} from "@/lib/workspace-digest-read";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { NotificationType } from "@/lib/notifications/types";
import type { OrgNotificationRow } from "@/lib/notifications/types";

type PanelTab = "notifications" | "digest";

const PAGE_SIZE = 20;

/** Normalize any stored invite URL to an in-app path so the client router always opens the accept page. */
function invitePathFromMetadata(m: Record<string, unknown>): string | null {
  const token =
    typeof m.invitationToken === "string" && m.invitationToken.trim().length > 0
      ? m.invitationToken.trim()
      : null;
  if (token) return `/invite/${encodeURIComponent(token)}`;

  const candidates = [typeof m.inviteUrl === "string" ? m.inviteUrl : null, typeof m.link === "string" ? m.link : null].filter(
    Boolean
  ) as string[];

  for (const raw of candidates) {
    const t = raw.trim();
    if (!t) continue;
    if (t.startsWith("/invite/")) {
      const slug = t.slice("/invite/".length).split(/[?#]/)[0];
      if (slug) return `/invite/${encodeURIComponent(slug)}`;
    }
    try {
      const base = typeof window !== "undefined" ? window.location.origin : "https://route5.ai";
      const u = new URL(t, t.startsWith("http") ? undefined : base);
      const pathMatch = u.pathname.match(/^\/invite\/([^/?#]+)/);
      if (pathMatch?.[1]) return `/invite/${encodeURIComponent(pathMatch[1])}`;
      const q = u.searchParams.get("invite");
      if (q) return `/invite/${encodeURIComponent(q)}`;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function formatTimeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type NotificationGroupLabel = "Today" | "This Week" | "Earlier";

function notificationGroupForDate(iso: string): NotificationGroupLabel {
  const now = new Date();
  const created = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = now.getTime() - created.getTime();
  if (created.getTime() >= startOfToday) return "Today";
  if (diff < 7 * 24 * 60 * 60 * 1000) return "This Week";
  return "Earlier";
}

function iconForType(t: NotificationType): LucideIcon {
  switch (t) {
    case "commitment_assigned":
      return UserPlus;
    case "commitment_due_soon":
      return Clock;
    case "commitment_overdue":
      return AlertCircle;
    case "chat_message":
      return MessageSquare;
    case "escalation_fired":
      return AlertTriangle;
    case "escalation_escalated":
      return ArrowUpRight;
    case "security_login_alert":
      return ShieldCheck;
    case "marketing_product_updates":
    case "marketing_feature_tips":
      return Sparkles;
    case "payment_failed":
      return CreditCard;
    case "subscription_cancelled":
      return XCircle;
    case "trial_ending":
      return Hourglass;
    case "team_invited":
      return Mail;
    case "weekly_summary":
      return BarChart2;
    case "daily_morning_digest":
      return Info;
    default:
      return Bell;
  }
}

function resolveNotificationHref(n: OrgNotificationRow): string | null {
  const m = n.metadata;
  if (n.type === "team_invited") {
    const fromMeta = invitePathFromMetadata(m);
    if (fromMeta) return fromMeta;
    if (typeof m.inviteUrl === "string" && m.inviteUrl.length > 0) return m.inviteUrl;
    if (typeof m.signupUrl === "string" && m.signupUrl.length > 0) return m.signupUrl;
    return "/workspace/organization";
  }
  if (typeof m.link === "string" && m.link.length > 0) return m.link;
  switch (n.type) {
    case "payment_failed":
    case "subscription_cancelled":
    case "trial_ending":
      return "/workspace/billing";
    case "weekly_summary":
      return "/workspace/dashboard";
    case "daily_morning_digest":
      return "/workspace/digest";
    case "chat_message":
      return "/workspace/chat";
    case "security_login_alert":
      return "/settings";
    case "marketing_product_updates":
      return "/product";
    case "marketing_feature_tips":
      return "/workspace/help";
    default:
      break;
  }
  if (typeof m.commitmentId === "string") {
    return `/workspace/commitments?id=${encodeURIComponent(String(m.commitmentId))}`;
  }
  if (
    n.type === "escalation_fired" ||
    n.type === "escalation_escalated"
  ) {
    return "/workspace/escalations";
  }
  return null;
}

/** Digest from live summary — red dot until viewed; optional full screen + org notification inbox. */
export default function WorkspaceNotificationsPopover() {
  const router = useRouter();
  const { pushToast, prefs } = useWorkspaceExperience();
  const { intlLocale } = useI18n();
  const { user } = useUser();
  const userId = user?.id;
  const [open, setOpen] = useState(false);
  const [readEpoch, setReadEpoch] = useState(0);
  const [tab, setTab] = useState<PanelTab>("notifications");
  const rootRef = useRef<HTMLDivElement>(null);
  const { summary, executionOverview, loadingSummary } = useWorkspaceData();

  const [notifLoading, setNotifLoading] = useState(false);
  const [notifList, setNotifList] = useState<OrgNotificationRow[]>([]);
  const [notifHasMore, setNotifHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [digestExpanded, setDigestExpanded] = useState<Record<number, boolean>>({});
  const nextOffsetRef = useRef(0);

  const fingerprint = useMemo(() => {
    if (!summary) return "0:0:0:";
    const latestId = summary.recent[0]?.id ?? null;
    const ex = executionOverview?.summary;
    return digestFingerprint({
      projectCount: summary.projectCount,
      extractionCount: summary.extractionCount,
      staleOpenActions: summary.execution.staleOpenActions,
      latestExtractionId: latestId,
      commitmentOverdue: ex?.overdueCount,
      commitmentAtRisk: ex?.atRiskCount,
      commitmentUnassigned: ex?.unassignedCount,
    });
  }, [summary, executionOverview]);

  const digestUnread = useMemo(() => {
    if (loadingSummary) return false;
    void readEpoch;
    return isDigestUnread(userId, fingerprint);
  }, [userId, fingerprint, loadingSummary, readEpoch]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { count?: number };
      if (res.ok && typeof data.count === "number") setUnreadCount(data.count);
    } catch {
      /* ignore */
    }
  }, []);

  const loadNotifications = useCallback(
    async (reset: boolean) => {
      if (!userId) return;
      if (reset) nextOffsetRef.current = 0;
      setNotifLoading(true);
      try {
        const offset = nextOffsetRef.current;
        const res = await fetch(
          `/api/notifications?limit=${PAGE_SIZE}&offset=${offset}`,
          { credentials: "same-origin" }
        );
        const data = (await res.json().catch(() => ({}))) as {
          notifications?: OrgNotificationRow[];
        };
        const batch = data.notifications ?? [];
        if (reset) {
          setNotifList(batch);
        } else {
          setNotifList((prev) => [...prev, ...batch]);
        }
        nextOffsetRef.current += batch.length;
        setNotifHasMore(batch.length === PAGE_SIZE);
      } catch {
        pushToast("Could not load notifications", "error");
      } finally {
        setNotifLoading(false);
      }
    },
    [userId, pushToast]
  );

  useEffect(() => {
    if (!userId) return;
    void loadUnreadCount();
  }, [userId, loadUnreadCount]);

  useEffect(() => {
    if (!open || tab !== "notifications" || !userId) return;
    void loadNotifications(true);
  }, [open, tab, userId, loadNotifications]);

  useEffect(() => {
    if (!userId) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const ch = client.channel(`org-notifications:${userId}`);
    ch.on("broadcast", { event: "notification" }, () => {
      void loadUnreadCount();
      if (open && tab === "notifications") void loadNotifications(true);
    });
    ch.subscribe();
    return () => {
      void client.removeChannel(ch);
    };
  }, [userId, open, tab, loadUnreadCount, loadNotifications]);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("route5:notifications-open", onOpen);
    return () => window.removeEventListener("route5:notifications-open", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const digestItems = useMemo(
    () =>
      buildDailyDigestListItems({
        loadingSummary,
        summary,
        executionOverview,
        intlLocale,
        workspaceTimezone: prefs.workspaceTimezone,
      }),
    [summary, executionOverview, loadingSummary, intlLocale, prefs.workspaceTimezone]
  );

  const hasAlertContent =
    !loadingSummary &&
    summary &&
    (summary.execution.staleOpenActions > 0 ||
      summary.extractionCount > 0 ||
      (executionOverview &&
        (executionOverview.summary.overdueCount > 0 ||
          executionOverview.summary.atRiskCount > 0 ||
          executionOverview.summary.unassignedCount > 0)));

  useEffect(() => {
    if (!open || !userId) return;
    if (fingerprint === "0:0:0:" && loadingSummary) return;
    markDigestFingerprintSeen(userId, fingerprint);
    setReadEpoch((e) => e + 1);
  }, [open, userId, fingerprint, loadingSummary]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
  }

  async function markAllRead() {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        pushToast("Could not update", "error");
        return;
      }
      setNotifList((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: n.readAt ?? new Date().toISOString() }))
      );
      setUnreadCount(0);
      pushToast("All marked read", "success");
    } catch {
      pushToast("Could not update", "error");
    }
  }

  async function markOneRead(id: string) {
    try {
      await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "POST",
        credentials: "same-origin",
      });
      setNotifList((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n
        )
      );
      void loadUnreadCount();
    } catch {
      /* ignore */
    }
  }

  async function clearAllNotifications() {
    try {
      const res = await fetch("/api/notifications/clear-all", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        pushToast("Could not clear notifications", "error");
        return;
      }
      setNotifList([]);
      setUnreadCount(0);
      pushToast("Notifications cleared", "success");
    } catch {
      pushToast("Could not clear notifications", "error");
    }
  }

  async function onClickNotification(n: OrgNotificationRow) {
    await markOneRead(n.id);
    const hrefRaw = resolveNotificationHref(n);
    handleOpenChange(false);
    let href = hrefRaw;
    if (href && /^https?:\/\//i.test(href)) {
      try {
        const u = new URL(href);
        const pathMatch = u.pathname.match(/^\/invite\/([^/?#]+)/);
        if (pathMatch?.[1]) {
          href = `/invite/${encodeURIComponent(pathMatch[1])}`;
        } else {
          const fromQuery = u.searchParams.get("invite");
          if (fromQuery) href = `/invite/${encodeURIComponent(fromQuery)}`;
        }
      } catch {
        /* ignore */
      }
    }
    if (!href) return;

    if (href.startsWith("/invite/")) {
      window.location.assign(href);
      return;
    }
    if (/^https?:\/\//i.test(href)) {
      window.location.assign(href);
      return;
    }
    router.push(href);
  }

  const panelHeader = (
    <div className="border-b border-r5-border-subtle px-3 py-2">
      <div className="flex items-center justify-between gap-2 px-1 py-1">
        <div className="flex rounded-xl border border-r5-border-subtle bg-r5-surface-primary/50 p-0.5">
          <button
            type="button"
            onClick={() => setTab("notifications")}
            className={`rounded-lg px-3 py-1.5 text-[length:var(--r5-font-body)] font-semibold transition ${
              tab === "notifications"
                ? "bg-r5-surface-hover text-r5-text-primary"
                : "text-r5-text-secondary hover:text-r5-text-primary"
            }`}
          >
            Alerts
          </button>
          <button
            type="button"
            onClick={() => setTab("digest")}
            className={`rounded-lg px-3 py-1.5 text-[length:var(--r5-font-body)] font-semibold transition ${
              tab === "digest"
                ? "bg-r5-surface-hover text-r5-text-primary"
                : "text-r5-text-secondary hover:text-r5-text-primary"
            }`}
          >
            Daily digest
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="rounded-lg p-2 text-r5-text-secondary transition hover:bg-r5-surface-hover hover:text-r5-text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {tab === "notifications" ? (
        <div className="mt-2 flex items-center justify-between gap-2 px-1 pb-1">
          <p className="text-[length:var(--r5-font-kbd)] font-semibold uppercase tracking-wide text-r5-text-secondary">
            Inbox
          </p>
          {unreadCount > 0 ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-[length:var(--r5-font-kbd)] font-medium text-r5-accent hover:underline"
              >
                Mark all as read
              </button>
              <button
                type="button"
                onClick={() => void clearAllNotifications()}
                className="text-[length:var(--r5-font-kbd)] font-medium text-r5-text-secondary hover:text-r5-text-primary hover:underline"
              >
                Clear all
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2 px-1 pb-1">
          <p className="text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">Daily digest</p>
          {hasAlertContent ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-r5-status-on-track/35 bg-r5-status-on-track/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-r5-status-on-track"
              title="Workspace digest"
            >
              <Info className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
              Live
            </span>
          ) : null}
        </div>
      )}
    </div>
  );

  const notificationsBody = (
    <div
      className={`overflow-y-auto px-2 py-2 min-h-0 flex-1`}
    >
      {notifLoading && notifList.length === 0 ? (
        <p className="px-3 py-4 text-[length:var(--r5-font-subheading)] text-r5-text-secondary">Loading…</p>
      ) : notifList.length === 0 ? (
        <p className="px-3 py-6 text-center text-[length:var(--r5-font-subheading)] text-r5-text-secondary">You are all caught up.</p>
      ) : (
        (["Today", "This Week", "Earlier"] as const).map((group) => {
          const grouped = notifList.filter((n) => notificationGroupForDate(n.createdAt) === group);
          if (grouped.length === 0) return null;
          return (
            <section key={group} className="mb-3">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-r5-text-secondary">
                {group}
              </p>
              {grouped.map((n) => {
                const Icon = iconForType(n.type);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => void onClickNotification(n)}
                    className={`mb-1 flex w-full gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      n.read ? "hover:bg-r5-surface-hover/40" : "bg-r5-surface-hover/60 hover:bg-r5-surface-hover"
                    }`}
                  >
                    <div className="relative shrink-0 pt-0.5">
                      <Icon className="h-4 w-4 text-r5-text-secondary" strokeWidth={2} aria-hidden />
                      {!n.read ? (
                        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-r5-accent shadow-[0_0_0_2px_rgba(9,9,11,0.95)]" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[length:var(--r5-font-subheading)] font-medium leading-snug text-r5-text-primary">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[length:var(--r5-font-body)] leading-snug text-r5-text-secondary">
                        {n.body}
                      </p>
                      <p className="mt-1 text-[11px] text-r5-text-tertiary">{formatTimeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                );
              })}
            </section>
          );
        })
      )}
      {notifHasMore ? (
        <div className="px-2 pb-2 pt-1">
          <button
            type="button"
            disabled={notifLoading}
            onClick={() => void loadNotifications(false)}
            className="w-full rounded-xl border border-r5-border-subtle bg-white/[0.03] py-2 text-[length:var(--r5-font-body)] font-medium text-r5-text-secondary transition hover:bg-r5-surface-hover/60 disabled:opacity-50"
          >
            {notifLoading ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );

  const digestBody = (
    <div className={`min-h-0 flex-1 space-y-2 overflow-y-auto px-2 py-3`}>
      {digestItems.map((item, i) => {
        const isHero = i === 0;
        const expanded = Boolean(digestExpanded[i]);
        const longBody = item.body.length > 180;
        const bodyText =
          longBody && !expanded
            ? `${item.body.slice(0, 180).replace(/\s+\S*$/, "")}…`
            : item.body;
        return (
          <div
            key={i}
            className={`rounded-2xl border px-3 py-3 transition-colors ${
              isHero
                ? "border-r5-border-subtle bg-r5-surface-secondary/80"
                : item.tone === "warn"
                  ? "border-r5-status-at-risk/25 bg-r5-status-at-risk/[0.07]"
                  : "border-transparent bg-r5-surface-hover/25 hover:bg-r5-surface-hover/40"
            }`}
          >
            <p
              className={`text-[11px] font-semibold uppercase tracking-wide ${
                isHero ? "text-r5-accent" : "text-r5-text-secondary"
              }`}
            >
              {item.title}
            </p>
            {item.href ? (
              <Link
                href={item.href}
                onClick={() => handleOpenChange(false)}
                className="mt-1.5 block text-[length:var(--r5-font-subheading)] leading-relaxed text-r5-text-primary"
              >
                {bodyText}
              </Link>
            ) : (
              <p className="mt-1.5 text-[length:var(--r5-font-subheading)] leading-relaxed text-r5-text-secondary">{bodyText}</p>
            )}
            {longBody ? (
              <button
                type="button"
                onClick={() =>
                  setDigestExpanded((prev) => ({
                    ...prev,
                    [i]: !expanded,
                  }))
                }
                className="mt-2 text-[11px] font-medium text-r5-accent hover:underline"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            ) : null}
          </div>
        );
      })}
      {loadingSummary ? (
        <p className="px-3 py-4 text-[length:var(--r5-font-subheading)] text-r5-text-secondary">Loading summary…</p>
      ) : null}
    </div>
  );

  const panelFooter = (
    <div className="border-t border-r5-border-subtle px-4 py-3">
      <Link
        href="/workspace/notifications/preferences"
        onClick={() => handleOpenChange(false)}
        className="text-[length:var(--r5-font-body)] font-medium text-r5-accent hover:underline"
      >
        Notification preferences
      </Link>
      <span className="mx-2 text-r5-text-tertiary">·</span>
      <Link
        href="/workspace/dashboard"
        onClick={() => handleOpenChange(false)}
        className="text-[length:var(--r5-font-body)] font-medium text-r5-text-secondary hover:text-zinc-200 hover:underline"
      >
        Home
      </Link>
    </div>
  );

  const panelContent = (
    <>
      {panelHeader}
      {tab === "notifications" ? notificationsBody : digestBody}
      {panelFooter}
    </>
  );

  const showNumberBadge = unreadCount > 0;
  const showDigestDot = !showNumberBadge && digestUnread;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => handleOpenChange(!open)}
        className="relative inline-flex rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary/90 p-[var(--r5-space-2)] text-r5-text-secondary shadow-[var(--r5-shadow-elevated)] transition-[background-color,color] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:bg-r5-surface-hover hover:text-r5-text-primary"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Notifications and daily digest"
      >
        <Bell className="h-4 w-4" strokeWidth={2} aria-hidden />
        {showNumberBadge ? (
          <span
            className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-[var(--r5-radius-pill)] bg-r5-status-overdue px-[var(--r5-space-1)] text-[length:var(--r5-font-kbd)] font-semibold text-r5-text-primary"
            title="Unread notifications"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : showDigestDot ? (
          <span
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-[var(--r5-radius-pill)] bg-r5-status-overdue"
            title="New digest updates"
            aria-hidden
          />
        ) : null}
      </button>

      {open
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[199] bg-black/40"
                aria-label="Close notifications"
                onClick={() => handleOpenChange(false)}
              />
              <aside
                className="fixed inset-y-0 right-0 z-[200] flex w-full max-w-[400px] flex-col border-l border-r5-border-subtle bg-r5-surface-primary/95 shadow-[var(--r5-shadow-elevated)] backdrop-blur-xl"
                role="dialog"
                aria-label="Notifications"
                aria-modal="true"
                onMouseDown={(event) => event.stopPropagation()}
              >
                {panelContent}
              </aside>
            </>,
            document.body
          )
        : null}
    </div>
  );
}
