"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Loader2,
  Mail,
  MessageSquare,
  Presentation,
  Video,
  Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type SlackOAuthInfo = {
  connected: boolean;
  teamName: string | null;
  connectedAt: string | null;
  metadata: {
    monitored_channel_ids?: string[];
    digest_channel_id?: string | null;
    escalation_channel_id?: string | null;
  };
};

type GmailOAuthInfo = {
  connected: boolean;
  emailAddress: string | null;
  connectedAt: string | null;
  lastUsedAt: string | null;
  watchExpiration: string | null;
  emailsProcessed: number;
  decisionsCaptured: number;
  recentDecisions: Array<{
    id: string;
    subject: string;
    bodyPreview: string;
    confidenceScore: number | null;
    processed: boolean;
    decisionDetected: boolean;
    commitmentId: string | null;
    capturedAt: string;
  }>;
};

type NotionOAuthInfo = {
  connected: boolean;
  workspaceName: string | null;
  connectedAt: string | null;
  lastUsedAt: string | null;
  databasesWatched: number;
  pagesProcessed: number;
  decisionsCaptured: number;
  recentDecisions: Array<{
    id: string;
    title: string;
    pagePreview: string;
    confidenceScore: number | null;
    processed: boolean;
    decisionDetected: boolean;
    commitmentId: string | null;
    capturedAt: string;
  }>;
};

type NotionDbRow = { id: string; name: string; url: string | null; watching: boolean };

type ReviewRow = {
  id: string;
  content: string;
  subject?: string;
  confidenceScore: number | null;
  decisionText: string | null;
  capturedAt: string;
};

type ChannelOpt = { id?: string; name?: string };

function IntegrationCard({
  icon: Icon,
  name,
  description,
  status,
  children,
}: {
  icon: LucideIcon;
  name: string;
  description: string;
  status: "connected" | "disconnected" | "coming_soon";
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 p-5">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--workspace-surface)]/80 text-[var(--workspace-fg)] ring-1 ring-white/5">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold text-[var(--workspace-fg)]">{name}</h2>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                status === "connected"
                  ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                  : status === "coming_soon"
                    ? "border-[var(--workspace-border)] text-[var(--workspace-muted-fg)]"
                    : "border-[var(--workspace-border)] text-[var(--workspace-muted-fg)]"
              }`}
            >
              {status === "connected" ? "Connected" : status === "coming_soon" ? "Coming soon" : "Disconnected"}
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">{description}</p>
          {children ? <div className="mt-4 space-y-3">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceIntegrations() {
  const [loading, setLoading] = useState(true);
  const [planAllows, setPlanAllows] = useState(false);
  const [slackOAuth, setSlackOAuth] = useState<SlackOAuthInfo | null>(null);
  const [gmailOAuth, setGmailOAuth] = useState<GmailOAuthInfo | null>(null);
  const [notionOAuth, setNotionOAuth] = useState<NotionOAuthInfo | null>(null);
  const [notionDatabases, setNotionDatabases] = useState<NotionDbRow[]>([]);
  const [loadingNotionDb, setLoadingNotionDb] = useState(false);
  const [channels, setChannels] = useState<ChannelOpt[]>([]);
  const [loadingCh, setLoadingCh] = useState(false);
  const [monitored, setMonitored] = useState<string[]>([]);
  const [digestCh, setDigestCh] = useState("");
  const [escCh, setEscCh] = useState("");
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState<ReviewRow[]>([]);
  const [loadingReview, setLoadingReview] = useState(false);
  const [gmailReview, setGmailReview] = useState<ReviewRow[]>([]);
  const [loadingGmailReview, setLoadingGmailReview] = useState(false);
  const [reviewTab, setReviewTab] = useState<"slack" | "gmail" | "notion">("slack");
  const [notionReview, setNotionReview] = useState<ReviewRow[]>([]);
  const [loadingNotionReview, setLoadingNotionReview] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [slackRes, gmailRes, notionRes] = await Promise.all([
        fetch("/api/integrations/slack", { credentials: "same-origin" }),
        fetch("/api/integrations/gmail", { credentials: "same-origin" }),
        fetch("/api/integrations/notion", { credentials: "same-origin" }),
      ]);
      const data = (await slackRes.json().catch(() => ({}))) as {
        planAllows?: boolean;
        slackOAuth?: SlackOAuthInfo | null;
      };
      const gmailData = (await gmailRes.json().catch(() => ({}))) as {
        planAllows?: boolean;
        gmailOAuth?: GmailOAuthInfo | null;
      };
      const notionData = (await notionRes.json().catch(() => ({}))) as {
        planAllows?: boolean;
        notionOAuth?: NotionOAuthInfo | null;
        watchedDatabases?: NotionDbRow[];
      };
      const allows =
        Boolean(data.planAllows) || Boolean(gmailData.planAllows) || Boolean(notionData.planAllows);
      if (slackRes.ok || gmailRes.ok || notionRes.ok) {
        setPlanAllows(allows);
      }
      if (slackRes.ok) {
        setSlackOAuth(data.slackOAuth ?? null);
        const m = data.slackOAuth?.metadata;
        if (m) {
          setMonitored(m.monitored_channel_ids ?? []);
          setDigestCh(m.digest_channel_id ?? "");
          setEscCh(m.escalation_channel_id ?? "");
        }
      }
      if (gmailRes.ok) {
        setGmailOAuth(gmailData.gmailOAuth ?? null);
      }
      if (notionRes.ok) {
        setNotionOAuth(notionData.notionOAuth ?? null);
        setNotionDatabases(notionData.watchedDatabases ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChannels = useCallback(async () => {
    setLoadingCh(true);
    try {
      const res = await fetch("/api/integrations/slack/channels", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { channels?: ChannelOpt[] };
      if (res.ok) setChannels(data.channels ?? []);
    } finally {
      setLoadingCh(false);
    }
  }, []);

  const loadReview = useCallback(async () => {
    setLoadingReview(true);
    try {
      const res = await fetch("/api/integrations/slack/review", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { pending?: ReviewRow[] };
      if (res.ok) setReview(data.pending ?? []);
    } finally {
      setLoadingReview(false);
    }
  }, []);

  const loadGmailReview = useCallback(async () => {
    setLoadingGmailReview(true);
    try {
      const res = await fetch("/api/integrations/gmail/review", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        pending?: Array<{
          id: string;
          subject: string;
          content: string;
          confidenceScore: number | null;
          decisionText: string | null;
          capturedAt: string;
        }>;
      };
      if (res.ok) {
        setGmailReview(
          (data.pending ?? []).map((p) => ({
            id: p.id,
            content: p.content,
            subject: p.subject,
            confidenceScore: p.confidenceScore,
            decisionText: p.decisionText,
            capturedAt: p.capturedAt,
          }))
        );
      }
    } finally {
      setLoadingGmailReview(false);
    }
  }, []);

  const loadNotionReview = useCallback(async () => {
    setLoadingNotionReview(true);
    try {
      const res = await fetch("/api/integrations/notion/review", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        pending?: Array<{
          id: string;
          title: string;
          content: string;
          confidenceScore: number | null;
          decisionText: string | null;
          capturedAt: string;
        }>;
      };
      if (res.ok) {
        setNotionReview(
          (data.pending ?? []).map((p) => ({
            id: p.id,
            content: p.content,
            subject: p.title,
            confidenceScore: p.confidenceScore,
            decisionText: p.decisionText,
            capturedAt: p.capturedAt,
          }))
        );
      }
    } finally {
      setLoadingNotionReview(false);
    }
  }, []);

  const loadNotionDatabases = useCallback(async () => {
    setLoadingNotionDb(true);
    try {
      const res = await fetch("/api/integrations/notion/databases", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { databases?: NotionDbRow[] };
      if (res.ok) setNotionDatabases(data.databases ?? []);
    } finally {
      setLoadingNotionDb(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!slackOAuth?.connected && gmailOAuth?.connected) setReviewTab("gmail");
  }, [slackOAuth?.connected, gmailOAuth?.connected]);

  useEffect(() => {
    if (!slackOAuth?.connected && !gmailOAuth?.connected && notionOAuth?.connected) {
      setReviewTab("notion");
    }
  }, [slackOAuth?.connected, gmailOAuth?.connected, notionOAuth?.connected]);

  useEffect(() => {
    if (slackOAuth?.connected && planAllows) {
      void loadChannels();
      void loadReview();
    }
  }, [slackOAuth?.connected, planAllows, loadChannels, loadReview]);

  useEffect(() => {
    if (gmailOAuth?.connected && planAllows) {
      void loadGmailReview();
    }
  }, [gmailOAuth?.connected, planAllows, loadGmailReview]);

  useEffect(() => {
    if (notionOAuth?.connected && planAllows) {
      void loadNotionReview();
      void loadNotionDatabases();
    }
  }, [notionOAuth?.connected, planAllows, loadNotionReview, loadNotionDatabases]);

  async function saveSlackSettings() {
    setSaving(true);
    try {
      await fetch("/api/integrations/slack/settings", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monitored_channel_ids: monitored,
          digest_channel_id: digestCh || null,
          escalation_channel_id: escCh || null,
        }),
      });
      await loadStatus();
    } finally {
      setSaving(false);
    }
  }

  async function disconnectSlack() {
    setSaving(true);
    try {
      await fetch("/api/integrations/slack/disconnect", { method: "POST", credentials: "same-origin" });
      await loadStatus();
    } finally {
      setSaving(false);
    }
  }

  async function approve(id: string) {
    await fetch(`/api/integrations/slack/review/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      credentials: "same-origin",
    });
    await loadReview();
  }

  async function reject(id: string) {
    await fetch(`/api/integrations/slack/review/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      credentials: "same-origin",
    });
    await loadReview();
  }

  async function disconnectGmail() {
    setSaving(true);
    try {
      await fetch("/api/integrations/gmail/disconnect", { method: "POST", credentials: "same-origin" });
      const res = await fetch("/api/integrations/gmail", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { gmailOAuth?: GmailOAuthInfo | null };
      if (res.ok) setGmailOAuth(data.gmailOAuth ?? null);
    } finally {
      setSaving(false);
    }
  }

  async function approveGmail(id: string) {
    await fetch(`/api/integrations/gmail/review/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      credentials: "same-origin",
    });
    await loadGmailReview();
    const res = await fetch("/api/integrations/gmail", { credentials: "same-origin" });
    const data = (await res.json().catch(() => ({}))) as { gmailOAuth?: GmailOAuthInfo | null };
    if (res.ok && data.gmailOAuth) setGmailOAuth(data.gmailOAuth);
  }

  async function rejectGmail(id: string) {
    await fetch(`/api/integrations/gmail/review/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      credentials: "same-origin",
    });
    await loadGmailReview();
    const res = await fetch("/api/integrations/gmail", { credentials: "same-origin" });
    const data = (await res.json().catch(() => ({}))) as { gmailOAuth?: GmailOAuthInfo | null };
    if (res.ok && data.gmailOAuth) setGmailOAuth(data.gmailOAuth);
  }

  async function disconnectNotion() {
    setSaving(true);
    try {
      await fetch("/api/integrations/notion/disconnect", { method: "POST", credentials: "same-origin" });
      const res = await fetch("/api/integrations/notion", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        notionOAuth?: NotionOAuthInfo | null;
        watchedDatabases?: NotionDbRow[];
      };
      if (res.ok) {
        setNotionOAuth(data.notionOAuth ?? null);
        setNotionDatabases(data.watchedDatabases ?? []);
      }
    } finally {
      setSaving(false);
    }
  }

  async function approveNotion(id: string) {
    await fetch(`/api/integrations/notion/review/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      credentials: "same-origin",
    });
    await loadNotionReview();
    const res = await fetch("/api/integrations/notion", { credentials: "same-origin" });
    const data = (await res.json().catch(() => ({}))) as { notionOAuth?: NotionOAuthInfo | null };
    if (res.ok && data.notionOAuth) setNotionOAuth(data.notionOAuth);
  }

  async function rejectNotion(id: string) {
    await fetch(`/api/integrations/notion/review/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      credentials: "same-origin",
    });
    await loadNotionReview();
    const res = await fetch("/api/integrations/notion", { credentials: "same-origin" });
    const data = (await res.json().catch(() => ({}))) as { notionOAuth?: NotionOAuthInfo | null };
    if (res.ok && data.notionOAuth) setNotionOAuth(data.notionOAuth);
  }

  async function setNotionWatch(dbId: string, watch: boolean) {
    setSaving(true);
    try {
      const path = watch ? "watch" : "unwatch";
      await fetch(
        `/api/integrations/notion/databases/${encodeURIComponent(dbId)}/${path}`,
        { method: "POST", credentials: "same-origin" }
      );
      await loadNotionDatabases();
      const res = await fetch("/api/integrations/notion", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { notionOAuth?: NotionOAuthInfo | null };
      if (res.ok && data.notionOAuth) setNotionOAuth(data.notionOAuth);
    } finally {
      setSaving(false);
    }
  }

  const slackStatus = slackOAuth?.connected ? "connected" : "disconnected";
  const gmailStatus = gmailOAuth?.connected ? "connected" : "disconnected";
  const notionStatus = notionOAuth?.connected ? "connected" : "disconnected";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[960px] flex-col gap-5 pb-24">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
          Workspace
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
          Integrations
        </h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Connect tools to Route5. Slack, Gmail, and Notion are available on supported plans; other connectors are
          listed for roadmap visibility.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[13px] text-[var(--workspace-muted-fg)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : null}

      <IntegrationCard
        icon={MessageSquare}
        name="Slack"
        description="OAuth workspace install, Events API decision capture, slash commands, escalations, and daily digest."
        status={!planAllows ? "coming_soon" : slackStatus}
      >
        {!planAllows ? (
          <Link
            href="/account/plans"
            className="inline-flex rounded-full border border-[var(--workspace-border)] px-4 py-2 text-[12px] font-semibold text-[var(--workspace-fg)] hover:bg-[var(--workspace-nav-hover)]"
          >
            Upgrade to connect
          </Link>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/integrations/slack/connect"
                className="inline-flex rounded-full bg-[var(--workspace-fg)] px-4 py-2 text-[12px] font-semibold text-[var(--workspace-canvas)]"
              >
                {slackOAuth?.connected ? "Reconnect Slack" : "Connect Slack"}
              </a>
              {slackOAuth?.connected ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void disconnectSlack()}
                  className="rounded-full border border-red-400/35 px-4 py-2 text-[12px] font-semibold text-red-200 disabled:opacity-50"
                >
                  Disconnect
                </button>
              ) : null}
            </div>
            {slackOAuth?.connected ? (
              <div className="space-y-2 text-[12px] text-[var(--workspace-muted-fg)]">
                <p>
                  Workspace: <span className="text-[var(--workspace-fg)]">{slackOAuth.teamName ?? "—"}</span>
                  {slackOAuth.connectedAt
                    ? ` · Connected ${new Date(slackOAuth.connectedAt).toLocaleString()}`
                    : null}
                </p>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">
                    Monitored channels
                  </p>
                  {loadingCh ? (
                    <Loader2 className="mt-1 h-4 w-4 animate-spin" />
                  ) : (
                    <select
                      multiple
                      value={monitored}
                      onChange={(e) =>
                        setMonitored([...e.target.selectedOptions].map((o) => o.value))
                      }
                      className="mt-1 min-h-[100px] w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-2 py-2 text-[12px] text-[var(--workspace-fg)]"
                    >
                      {channels.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name ?? c.id}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">
                      Digest channel
                    </span>
                    <select
                      value={digestCh}
                      onChange={(e) => setDigestCh(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-2 py-2 text-[12px] text-[var(--workspace-fg)]"
                    >
                      <option value="">Select…</option>
                      {channels.map((c) => (
                        <option key={`d-${c.id}`} value={c.id}>
                          {c.name ?? c.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">
                      Escalation channel
                    </span>
                    <select
                      value={escCh}
                      onChange={(e) => setEscCh(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/50 px-2 py-2 text-[12px] text-[var(--workspace-fg)]"
                    >
                      <option value="">Select…</option>
                      {channels.map((c) => (
                        <option key={`e-${c.id}`} value={c.id}>
                          {c.name ?? c.id}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveSlackSettings()}
                  className="rounded-full border border-[var(--workspace-border)] px-4 py-2 text-[12px] font-semibold text-[var(--workspace-fg)] disabled:opacity-50"
                >
                  Save channel settings
                </button>
              </div>
            ) : null}
          </>
        )}
      </IntegrationCard>

      {planAllows && (slackOAuth?.connected || gmailOAuth?.connected || notionOAuth?.connected) ? (
        <div className="rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 p-5">
          <h2 className="text-[14px] font-semibold text-[var(--workspace-fg)]">Decision review queue</h2>
          <p className="mt-1 text-[12px] text-[var(--workspace-muted-fg)]">
            Medium-confidence items awaiting approval before creating a commitment.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {slackOAuth?.connected ? (
              <button
                type="button"
                onClick={() => setReviewTab("slack")}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                  reviewTab === "slack"
                    ? "bg-[var(--workspace-fg)] text-[var(--workspace-canvas)]"
                    : "border border-[var(--workspace-border)] text-[var(--workspace-fg)]"
                }`}
              >
                Slack
              </button>
            ) : null}
            {gmailOAuth?.connected ? (
              <button
                type="button"
                onClick={() => setReviewTab("gmail")}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                  reviewTab === "gmail"
                    ? "bg-[var(--workspace-fg)] text-[var(--workspace-canvas)]"
                    : "border border-[var(--workspace-border)] text-[var(--workspace-fg)]"
                }`}
              >
                Gmail
              </button>
            ) : null}
            {notionOAuth?.connected ? (
              <button
                type="button"
                onClick={() => setReviewTab("notion")}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                  reviewTab === "notion"
                    ? "bg-[var(--workspace-fg)] text-[var(--workspace-canvas)]"
                    : "border border-[var(--workspace-border)] text-[var(--workspace-fg)]"
                }`}
              >
                Notion
              </button>
            ) : null}
          </div>
          {reviewTab === "slack" && slackOAuth?.connected ? (
            loadingReview ? (
              <Loader2 className="mt-3 h-4 w-4 animate-spin text-[var(--workspace-muted-fg)]" />
            ) : review.length === 0 ? (
              <p className="mt-3 text-[13px] text-[var(--workspace-muted-fg)]">No pending Slack items.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {review.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/40 p-3 text-[13px]"
                  >
                    <p className="whitespace-pre-wrap text-[var(--workspace-fg)]">{r.content}</p>
                    <p className="mt-1 text-[11px] text-[var(--workspace-muted-fg)]">
                      Confidence: {r.confidenceScore?.toFixed(2) ?? "—"} ·{" "}
                      {new Date(r.capturedAt).toLocaleString()}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void approve(r.id)}
                        className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[12px] font-semibold text-emerald-100"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void reject(r.id)}
                        className="rounded-lg border border-[var(--workspace-border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--workspace-fg)]"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : null}
          {reviewTab === "gmail" && gmailOAuth?.connected ? (
            loadingGmailReview ? (
              <Loader2 className="mt-3 h-4 w-4 animate-spin text-[var(--workspace-muted-fg)]" />
            ) : gmailReview.length === 0 ? (
              <p className="mt-3 text-[13px] text-[var(--workspace-muted-fg)]">No pending Gmail items.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {gmailReview.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/40 p-3 text-[13px]"
                  >
                    {r.subject ? (
                      <p className="font-medium text-[var(--workspace-fg)]">{r.subject}</p>
                    ) : null}
                    <p className="mt-1 whitespace-pre-wrap text-[var(--workspace-fg)]">{r.content}</p>
                    <p className="mt-1 text-[11px] text-[var(--workspace-muted-fg)]">
                      Confidence: {r.confidenceScore?.toFixed(2) ?? "—"} ·{" "}
                      {new Date(r.capturedAt).toLocaleString()}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void approveGmail(r.id)}
                        className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[12px] font-semibold text-emerald-100"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void rejectGmail(r.id)}
                        className="rounded-lg border border-[var(--workspace-border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--workspace-fg)]"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : null}
          {reviewTab === "notion" && notionOAuth?.connected ? (
            loadingNotionReview ? (
              <Loader2 className="mt-3 h-4 w-4 animate-spin text-[var(--workspace-muted-fg)]" />
            ) : notionReview.length === 0 ? (
              <p className="mt-3 text-[13px] text-[var(--workspace-muted-fg)]">No pending Notion items.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {notionReview.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/40 p-3 text-[13px]"
                  >
                    {r.subject ? (
                      <p className="font-medium text-[var(--workspace-fg)]">{r.subject}</p>
                    ) : null}
                    <p className="mt-1 whitespace-pre-wrap text-[var(--workspace-fg)]">{r.content}</p>
                    <p className="mt-1 text-[11px] text-[var(--workspace-muted-fg)]">
                      Confidence: {r.confidenceScore?.toFixed(2) ?? "—"} ·{" "}
                      {new Date(r.capturedAt).toLocaleString()}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void approveNotion(r.id)}
                        className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[12px] font-semibold text-emerald-100"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void rejectNotion(r.id)}
                        className="rounded-lg border border-[var(--workspace-border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--workspace-fg)]"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </div>
      ) : null}

      <IntegrationCard
        icon={Mail}
        name="Gmail"
        description="OAuth, Pub/Sub push, decision capture from inbox, and weekly executive summary email."
        status={!planAllows ? "coming_soon" : gmailStatus}
      >
        {!planAllows ? (
          <Link
            href="/account/plans"
            className="inline-flex rounded-full border border-[var(--workspace-border)] px-4 py-2 text-[12px] font-semibold text-[var(--workspace-fg)] hover:bg-[var(--workspace-nav-hover)]"
          >
            Upgrade to connect
          </Link>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/integrations/gmail/connect"
                className="inline-flex rounded-full bg-[var(--workspace-fg)] px-4 py-2 text-[12px] font-semibold text-[var(--workspace-canvas)]"
              >
                {gmailOAuth?.connected ? "Reconnect Gmail" : "Connect Gmail"}
              </a>
              {gmailOAuth?.connected ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void disconnectGmail()}
                  className="rounded-full border border-red-400/35 px-4 py-2 text-[12px] font-semibold text-red-200 disabled:opacity-50"
                >
                  Disconnect
                </button>
              ) : null}
            </div>
            {gmailOAuth?.connected ? (
              <div className="space-y-2 text-[12px] text-[var(--workspace-muted-fg)]">
                <p>
                  Account: <span className="text-[var(--workspace-fg)]">{gmailOAuth.emailAddress ?? "—"}</span>
                  {gmailOAuth.connectedAt
                    ? ` · Connected ${new Date(gmailOAuth.connectedAt).toLocaleString()}`
                    : null}
                </p>
                <p>
                  Last sync:{" "}
                  <span className="text-[var(--workspace-fg)]">
                    {gmailOAuth.lastUsedAt
                      ? new Date(gmailOAuth.lastUsedAt).toLocaleString()
                      : "—"}
                  </span>
                  {gmailOAuth.watchExpiration
                    ? ` · Watch renews before ${new Date(gmailOAuth.watchExpiration).toLocaleString()}`
                    : null}
                </p>
                <p>
                  Emails processed:{" "}
                  <span className="text-[var(--workspace-fg)]">{gmailOAuth.emailsProcessed}</span> · Decisions
                  captured:{" "}
                  <span className="text-[var(--workspace-fg)]">{gmailOAuth.decisionsCaptured}</span>
                </p>
                {gmailOAuth.recentDecisions.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">
                      Recent captured decisions
                    </p>
                    <ul className="mt-2 space-y-2">
                      {gmailOAuth.recentDecisions.map((d) => {
                        const needsReview =
                          !d.processed && d.decisionDetected && d.commitmentId == null;
                        return (
                          <li
                            key={d.id}
                            className="rounded-xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/40 p-3"
                          >
                            <p className="text-[13px] font-medium text-[var(--workspace-fg)]">{d.subject}</p>
                            <p className="mt-1 line-clamp-3 text-[12px] text-[var(--workspace-muted-fg)]">
                              {d.bodyPreview}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--workspace-muted-fg)]">
                              {new Date(d.capturedAt).toLocaleString()}
                              {d.confidenceScore != null ? ` · ${d.confidenceScore.toFixed(2)}` : ""}
                            </p>
                            {needsReview ? (
                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => void approveGmail(d.id)}
                                  className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[12px] font-semibold text-emerald-100"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void rejectGmail(d.id)}
                                  className="rounded-lg border border-[var(--workspace-border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--workspace-fg)]"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </IntegrationCard>

      <IntegrationCard
        icon={Presentation}
        name="Notion"
        description="OAuth, database polling, decision capture from pages, and completion write-back."
        status={!planAllows ? "coming_soon" : notionStatus}
      >
        {!planAllows ? (
          <Link
            href="/account/plans"
            className="inline-flex rounded-full border border-[var(--workspace-border)] px-4 py-2 text-[12px] font-semibold text-[var(--workspace-fg)] hover:bg-[var(--workspace-nav-hover)]"
          >
            Upgrade to connect
          </Link>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/integrations/notion/connect"
                className="inline-flex rounded-full bg-[var(--workspace-fg)] px-4 py-2 text-[12px] font-semibold text-[var(--workspace-canvas)]"
              >
                {notionOAuth?.connected ? "Reconnect Notion" : "Connect Notion"}
              </a>
              {notionOAuth?.connected ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void disconnectNotion()}
                  className="rounded-full border border-red-400/35 px-4 py-2 text-[12px] font-semibold text-red-200 disabled:opacity-50"
                >
                  Disconnect
                </button>
              ) : null}
            </div>
            {notionOAuth?.connected ? (
              <div className="space-y-2 text-[12px] text-[var(--workspace-muted-fg)]">
                <p>
                  Workspace: <span className="text-[var(--workspace-fg)]">{notionOAuth.workspaceName ?? "—"}</span>
                  {notionOAuth.connectedAt
                    ? ` · Connected ${new Date(notionOAuth.connectedAt).toLocaleString()}`
                    : null}
                </p>
                <p>
                  Databases watched:{" "}
                  <span className="text-[var(--workspace-fg)]">{notionOAuth.databasesWatched}</span> · Pages
                  processed: <span className="text-[var(--workspace-fg)]">{notionOAuth.pagesProcessed}</span> ·
                  Decisions captured:{" "}
                  <span className="text-[var(--workspace-fg)]">{notionOAuth.decisionsCaptured}</span>
                </p>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">
                    Databases (watch / unwatch)
                  </p>
                  {loadingNotionDb ? (
                    <Loader2 className="mt-1 h-4 w-4 animate-spin" />
                  ) : notionDatabases.length === 0 ? (
                    <p className="mt-1 text-[12px]">No databases found — share databases with the integration in Notion.</p>
                  ) : (
                    <ul className="mt-2 max-h-[220px] space-y-2 overflow-y-auto">
                      {notionDatabases.map((db) => (
                        <li
                          key={db.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/40 px-3 py-2"
                        >
                          <span className="min-w-0 text-[12px] text-[var(--workspace-fg)]">{db.name}</span>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void setNotionWatch(db.id, !db.watching)}
                            className="shrink-0 rounded-full border border-[var(--workspace-border)] px-3 py-1 text-[11px] font-semibold text-[var(--workspace-fg)] disabled:opacity-50"
                          >
                            {db.watching ? "Unwatch" : "Watch"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {notionOAuth.recentDecisions.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-[var(--workspace-muted-fg)]">
                      Recent captured decisions
                    </p>
                    <ul className="mt-2 space-y-2">
                      {notionOAuth.recentDecisions.map((d) => {
                        const needsReview =
                          !d.processed && d.decisionDetected && d.commitmentId == null;
                        return (
                          <li
                            key={d.id}
                            className="rounded-xl border border-[var(--workspace-border)]/80 bg-[var(--workspace-surface)]/40 p-3"
                          >
                            <p className="text-[13px] font-medium text-[var(--workspace-fg)]">{d.title}</p>
                            <p className="mt-1 line-clamp-3 text-[12px] text-[var(--workspace-muted-fg)]">
                              {d.pagePreview}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--workspace-muted-fg)]">
                              {new Date(d.capturedAt).toLocaleString()}
                              {d.confidenceScore != null ? ` · ${d.confidenceScore.toFixed(2)}` : ""}
                            </p>
                            {needsReview ? (
                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => void approveNotion(d.id)}
                                  className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[12px] font-semibold text-emerald-100"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void rejectNotion(d.id)}
                                  className="rounded-lg border border-[var(--workspace-border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--workspace-fg)]"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </IntegrationCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <IntegrationCard
          icon={Video}
          name="Zoom"
          description="Meeting ingestion and recap routing (roadmap)."
          status="coming_soon"
        />
        <IntegrationCard
          icon={Calendar}
          name="Google Meet"
          description="Calendar-aware capture (roadmap)."
          status="coming_soon"
        />
        <IntegrationCard
          icon={Building2}
          name="Microsoft Teams"
          description="Enterprise messaging bridge (roadmap)."
          status="coming_soon"
        />
        <IntegrationCard
          icon={Calendar}
          name="Google Calendar"
          description="Deadlines and reminders (roadmap)."
          status="coming_soon"
        />
      </div>
    </div>
  );
}
