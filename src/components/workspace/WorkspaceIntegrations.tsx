"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Calendar,
  Mail,
  MessageSquare,
  Presentation,
  Video,
  Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

function IntegrationCard({
  icon: Icon,
  name,
  description,
  status,
}: {
  icon: LucideIcon;
  name: string;
  description: string;
  status: "connected" | "disconnected" | "coming_soon";
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
              {status === "connected"
                ? "Connected"
                : status === "coming_soon"
                  ? "Coming soon"
                  : "Disconnected"}
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceIntegrations() {
  const [email, setEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [waitlistMsg, setWaitlistMsg] = useState<string | null>(null);

  async function submitWaitlist(e: FormEvent) {
    e.preventDefault();
    setWaitlistStatus("loading");
    setWaitlistMsg(null);
    try {
      const res = await fetch("/api/integrations/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        setWaitlistStatus("ok");
        setWaitlistMsg("You’re on the list — we’ll email you when connectors go live.");
        setEmail("");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 409) {
        setWaitlistStatus("err");
        setWaitlistMsg("That email is already registered.");
        return;
      }
      setWaitlistStatus("err");
      setWaitlistMsg(data.error ?? "Could not save — try again.");
    } catch {
      setWaitlistStatus("err");
      setWaitlistMsg("Network error — try again.");
    }
  }

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
          Connect Slack, Gmail, Notion, Zoom, and Teams when they ship. Desk and projects already capture decisions from
          pasted text — connectors will add live sync from the tools you already use.
        </p>
      </div>

      <form
        onSubmit={(e) => void submitWaitlist(e)}
        className="rounded-[20px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/40 p-5"
      >
        <label htmlFor="integration-waitlist-email" className="text-[13px] font-medium text-[var(--workspace-fg)]">
          Get notified when integrations go live
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            id="integration-waitlist-email"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="min-h-[44px] w-full flex-1 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[14px] text-[var(--workspace-fg)] outline-none placeholder:text-[var(--workspace-muted-fg)] focus:border-[var(--workspace-accent)]/50 sm:max-w-md"
            required
          />
          <button
            type="submit"
            disabled={waitlistStatus === "loading"}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-[var(--workspace-fg)] px-5 text-[13px] font-semibold text-[var(--workspace-canvas)] transition hover:opacity-95 disabled:opacity-60"
          >
            {waitlistStatus === "loading" ? "Saving…" : "Notify me"}
          </button>
        </div>
        {waitlistMsg ? (
          <p
            className={`mt-3 text-[13px] ${waitlistStatus === "ok" ? "text-emerald-300/95" : "text-amber-200/90"}`}
            role="status"
          >
            {waitlistMsg}
          </p>
        ) : null}
      </form>

      <IntegrationCard
        icon={MessageSquare}
        name="Slack"
        description="Workspace install, Events API decision capture, slash commands, escalations, and daily digest — coming soon."
        status="coming_soon"
      />

      <IntegrationCard
        icon={Mail}
        name="Gmail"
        description="OAuth, inbox decision capture, and executive summary email — coming soon."
        status="coming_soon"
      />

      <IntegrationCard
        icon={Presentation}
        name="Notion"
        description="OAuth, database sync, decision capture from pages, and completion write-back — coming soon."
        status="coming_soon"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <IntegrationCard
          icon={Video}
          name="Zoom"
          description="OAuth, recording transcripts, and decision capture — coming soon."
          status="coming_soon"
        />
        <IntegrationCard
          icon={Calendar}
          name="Google Meet"
          description="Meet scope with your Google connection — coming soon."
          status="coming_soon"
        />
        <IntegrationCard
          icon={Building2}
          name="Microsoft Teams"
          description="Graph messages, commands, and Outlook calendar — coming soon."
          status="coming_soon"
        />
        <IntegrationCard
          icon={Calendar}
          name="Calendar deadlines"
          description="Google Calendar and Outlook events for commitment deadlines — coming soon."
          status="coming_soon"
        />
      </div>

      <p className="text-center text-[12px] text-[var(--workspace-muted-fg)]">
        <Link href="/overview" className="font-medium text-[var(--workspace-accent)] hover:underline">
          ← Overview
        </Link>
      </p>
    </div>
  );
}
