"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { CheckCircle2, Copy, Loader2, Mail, Sparkles, Webhook } from "lucide-react";
import OnboardingExtractionDemo from "@/components/onboarding/OnboardingExtractionDemo";

const USE_CASES = ["operations", "consulting", "finance", "legal", "other"] as const;

const STEPS = [
  { id: "org_setup", title: "Organization" },
  { id: "invite_team", title: "Team" },
  { id: "connect_integration", title: "Integrations" },
  { id: "first_commitment", title: "Capture" },
  { id: "complete", title: "Feed" },
] as const;

type IngestInfo = { webhookUrl?: string };
type ForwardingInfo = { forwardingAddress?: string };

export default function WorkspaceOnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [orgName, setOrgName] = useState("");
  const [useCase, setUseCase] = useState<string>("operations");
  const [emails, setEmails] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [forwardingAddress, setForwardingAddress] = useState<string>("");
  const [copied, setCopied] = useState<"webhook" | "forwarding" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/onboarding", { credentials: "same-origin" });
      const data = (await res.json()) as {
        complete?: boolean;
        steps?: Record<string, boolean>;
        orgName?: string;
        primaryUseCase?: string | null;
      };
      if (data.complete) {
        router.replace("/workspace/dashboard");
        return;
      }
      if (data.orgName) setOrgName(data.orgName);
      if (data.primaryUseCase) setUseCase(data.primaryUseCase);
      const order = STEPS.map((s) => s.id);
      const idx = order.findIndex((id) => !data.steps?.[id as keyof typeof data.steps]);
      setStepIndex(idx === -1 ? 0 : idx);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveOrgSetup() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/workspace/onboarding", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "org_setup",
          orgName: orgName.trim() || "Workspace",
          primaryUseCase: useCase,
        }),
      });
      if (!res.ok) throw new Error("Could not save.");
      setStepIndex(1);
    } catch {
      setErr("Could not save workspace.");
    } finally {
      setBusy(false);
    }
  }

  async function saveInvite(skip: boolean) {
    setBusy(true);
    setErr(null);
    try {
      const list = skip
        ? []
        : emails
            .split(/[\n,;]+/)
            .map((s) => s.trim())
            .filter(Boolean);
      const res = await fetch("/api/workspace/onboarding", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite_team", emails: list }),
      });
      if (!res.ok) throw new Error("Could not send invites.");
      setStepIndex(2);
    } catch {
      setErr("Could not complete step.");
    } finally {
      setBusy(false);
    }
  }

  const advanceDeskStep = useCallback(async (opts: { skip: boolean }) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/workspace/onboarding", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect_integration",
          skipIntegration: opts.skip,
          completedDeskDemo: !opts.skip ? true : undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not continue.");
      }
      setStepIndex(3);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not continue.");
    } finally {
      setBusy(false);
    }
  }, []);

  const skipDeskStep = useCallback(() => void advanceDeskStep({ skip: true }), [advanceDeskStep]);

  const onFirstCaptureComplete = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/workspace/onboarding", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "first_commitment" }),
      });
      if (!res.ok) throw new Error("Could not complete onboarding step.");
      setStepIndex(4);
    } catch {
      setErr("Could not complete onboarding step.");
    } finally {
      setBusy(false);
    }
  }, []);

  const copyText = useCallback(async (value: string, kind: "webhook" | "forwarding") => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      /* ignore */
    }
  }, []);

  async function finish() {
    setBusy(true);
    try {
      await fetch("/api/workspace/onboarding", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      router.replace("/workspace/dashboard");
    } finally {
      setBusy(false);
    }
  }

  const first = user?.firstName || "there";
  const projectDefaultName = orgName.trim() ? `${orgName.trim()} — primary` : "Primary workspace";

  useEffect(() => {
    if (stepIndex !== 2) return;
    let cancelled = false;
    (async () => {
      try {
        const [ingestRes, forwardingRes] = await Promise.all([
          fetch("/api/ingest", { credentials: "same-origin" }),
          fetch("/api/ingest/forwarding", { credentials: "same-origin" }),
        ]);
        const ingest = (await ingestRes.json().catch(() => ({}))) as IngestInfo;
        const forwarding = (await forwardingRes.json().catch(() => ({}))) as ForwardingInfo;
        if (cancelled) return;
        setWebhookUrl(ingest.webhookUrl ?? "");
        setForwardingAddress(forwarding.forwardingAddress ?? "");
      } catch {
        if (!cancelled) {
          setWebhookUrl("");
          setForwardingAddress("");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stepIndex]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--workspace-muted-fg)]" />
      </div>
    );
  }

  return (
    <div className="r5-immersive-stage mx-auto w-full max-w-2xl pb-20">
      <div className="workspace-preview-panel mb-5 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">
          Route5 setup studio
          </p>
          <Link
            href="/feed"
            className="text-[12px] font-medium text-[var(--workspace-muted-fg)] underline-offset-2 transition hover:text-[var(--workspace-fg)] hover:underline"
          >
            Skip setup
          </Link>
        </div>
        <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-[var(--workspace-fg)]">
          Build your workspace in five focused steps
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Everything here is live: projects, Desk capture, commitments, and team setup. You leave onboarding with a
          working command center, not placeholder data.
        </p>
      </div>
      <div className="mb-8 flex justify-center gap-1">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`h-1.5 flex-1 rounded-full ${
              i <= stepIndex ? "bg-[var(--workspace-accent)]" : "bg-[var(--workspace-border)]"
            }`}
            title={s.title}
          />
        ))}
      </div>

      {err ? <p className="mb-4 text-[13px] text-red-400">{err}</p> : null}

      {stepIndex === 0 ? (
        <motion.section
          initial={{ opacity: 0, y: 10, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="workspace-preview-panel p-6"
        >
          <div className="flex items-center gap-2 text-[var(--workspace-accent)]">
            <Sparkles className="h-5 w-5" strokeWidth={2} aria-hidden />
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">
              Step 1 · Workspace
            </p>
          </div>
          <h1 className="mt-2 text-[20px] font-semibold text-[var(--workspace-fg)]">Welcome, {first}</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
            Name your organization and choose how you&apos;ll use Route5. This powers defaults and labels across Desk and
            Feed.
          </p>
          <label className="mt-4 block text-[12px] font-medium text-[var(--workspace-muted-fg)]">
            Organization name
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 px-3 py-2 text-[14px] text-[var(--workspace-fg)]"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Acme Ops"
          />
          <label className="mt-4 block text-[12px] font-medium text-[var(--workspace-muted-fg)]">
            Primary use case
          </label>
          <select
            className="mt-1 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 px-3 py-2 text-[14px] text-[var(--workspace-fg)]"
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
          >
            {USE_CASES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-[var(--workspace-accent)] px-4 py-3 text-[14px] font-semibold text-[var(--workspace-accent-fg)] disabled:opacity-50"
            onClick={() => void saveOrgSetup()}
          >
            {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Continue"}
          </button>
        </motion.section>
      ) : null}

      {stepIndex === 1 ? (
        <motion.section
          initial={{ opacity: 0, y: 10, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="workspace-preview-panel p-6"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">
            Step 2 · People
          </p>
          <h2 className="mt-2 text-[18px] font-semibold text-[var(--workspace-fg)]">Invite teammates</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
            Paste emails (comma or newline separated). Invites use your live Clerk org — skip if you&apos;re solo for
            now.
          </p>
          <textarea
            className="mt-4 min-h-[100px] w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 px-3 py-2 text-[14px] text-[var(--workspace-fg)]"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="colleague@company.com"
          />
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy}
              className="flex-1 rounded-xl border border-[var(--workspace-border)] px-4 py-3 text-[14px] font-medium text-[var(--workspace-fg)]"
              onClick={() => void saveInvite(true)}
            >
              Skip
            </button>
            <button
              type="button"
              disabled={busy}
              className="flex-1 rounded-xl bg-[var(--workspace-accent)] px-4 py-3 text-[14px] font-semibold text-[var(--workspace-accent-fg)]"
              onClick={() => void saveInvite(false)}
            >
              Send invites
            </button>
          </div>
        </motion.section>
      ) : null}

      {stepIndex === 2 ? (
        <motion.section
          initial={{ opacity: 0, y: 10, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="workspace-preview-panel space-y-5 p-6"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">
              Step 3 · Integrations
            </p>
            <h2 className="mt-2 text-[18px] font-semibold text-[var(--workspace-fg)]">Your live webhook and forwarding address</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
              These work now. Connect automation using the webhook URL, or forward decisions by email.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 p-3">
              <div className="flex items-center gap-2">
                <Webhook className="h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
                <p className="text-[12px] font-semibold text-[var(--workspace-fg)]">Webhook URL</p>
              </div>
              <p className="mt-2 break-all rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-2 font-mono text-[12px] text-[var(--workspace-fg)]">
                {webhookUrl || "Loading…"}
              </p>
              <button
                type="button"
                onClick={() => void copyText(webhookUrl, "webhook")}
                className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[var(--workspace-border)] px-2 py-1 text-[12px] text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-nav-hover)]"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                {copied === "webhook" ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 p-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
                <p className="text-[12px] font-semibold text-[var(--workspace-fg)]">Forwarding address</p>
              </div>
              <p className="mt-2 break-all rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-2 font-mono text-[12px] text-[var(--workspace-fg)]">
                {forwardingAddress || "Loading…"}
              </p>
              <button
                type="button"
                onClick={() => void copyText(forwardingAddress, "forwarding")}
                className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[var(--workspace-border)] px-2 py-1 text-[12px] text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-nav-hover)]"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                {copied === "forwarding" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy}
              className="rounded-xl border border-[var(--workspace-border)] px-4 py-3 text-[14px] font-medium text-[var(--workspace-fg)]"
              onClick={() => void skipDeskStep()}
            >
              Skip for now
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-xl bg-[var(--workspace-accent)] px-4 py-3 text-[14px] font-semibold text-[var(--workspace-accent-fg)]"
              onClick={() => void advanceDeskStep({ skip: false })}
            >
              Continue
            </button>
          </div>
        </motion.section>
      ) : null}

      {stepIndex === 3 ? (
        <motion.section
          initial={{ opacity: 0, y: 10, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="workspace-preview-panel p-6"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">
            Step 4 · Capture
          </p>
          <h2 className="mt-2 text-[18px] font-semibold text-[var(--workspace-fg)]">Paste notes and capture your first commitments</h2>
          <p className="mt-2 text-[14px] text-[var(--workspace-muted-fg)]">
            This uses the same live flow as Capture and Feed. Once this succeeds, you&apos;re done.
          </p>
          <OnboardingExtractionDemo
            variant="workspace"
            defaultProjectName={projectDefaultName}
            onExtractionComplete={() => void onFirstCaptureComplete()}
          />
        </motion.section>
      ) : null}

      {stepIndex === 4 ? (
        <motion.section
          initial={{ opacity: 0, y: 10, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="workspace-preview-panel p-6 text-center"
        >
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
          <h2 className="mt-4 text-[18px] font-semibold text-[var(--workspace-fg)]">You&apos;re set up</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
            You now have a configured workspace with integrations and real commitments in Feed. Press{" "}
            <kbd className="rounded border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-1.5 py-0.5 font-mono text-[12px]">
              ⌘J
            </kbd>{" "}
            anytime to open Capture.
          </p>
          <button
            type="button"
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-[var(--workspace-accent)] px-4 py-3 text-[14px] font-semibold text-[var(--workspace-accent-fg)]"
            onClick={() => void finish()}
          >
            Go to Feed
          </button>
        </motion.section>
      ) : null}
    </div>
  );
}
