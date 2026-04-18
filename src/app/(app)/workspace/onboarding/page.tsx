"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { CheckCircle2, Loader2 } from "lucide-react";

const USE_CASES = ["operations", "consulting", "finance", "legal", "other"] as const;

const STEPS = [
  { id: "org_setup", title: "Workspace" },
  { id: "invite_team", title: "Invite team" },
  { id: "connect_integration", title: "Connect tools" },
  { id: "first_commitment", title: "First commitment" },
  { id: "complete", title: "Done" },
] as const;

export default function WorkspaceOnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [orgName, setOrgName] = useState("");
  const [useCase, setUseCase] = useState<string>("operations");
  const [emails, setEmails] = useState("");
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  async function saveIntegration(skip: boolean) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/workspace/onboarding", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect_integration", skipIntegration: skip }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Connect an integration or skip.");
      }
      setStepIndex(3);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not complete step.");
    } finally {
      setBusy(false);
    }
  }

  async function createFirstCommitment() {
    const uid = user?.id;
    if (!uid) {
      setErr("Sign in required.");
      return;
    }
    const t = title.trim() || "Your first commitment";
    const dl = deadline.trim() || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/commitments", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          description: "",
          ownerId: uid,
          deadline: new Date(dl).toISOString(),
          priority,
        }),
      });
      if (!res.ok) throw new Error("Could not create commitment.");
      await fetch("/api/workspace/onboarding", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "first_commitment" }),
      });
      setStepIndex(4);
    } catch {
      setErr("Could not create commitment.");
    } finally {
      setBusy(false);
    }
  }

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

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--workspace-muted-fg)]" />
      </div>
    );
  }

  const first = user?.firstName || "there";

  return (
    <div className="mx-auto w-full max-w-lg pb-20">
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
        <section className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-6">
          <h1 className="text-[20px] font-semibold text-[var(--workspace-fg)]">Welcome, {first}</h1>
          <p className="mt-2 text-[14px] text-[var(--workspace-muted-fg)]">
            Name your workspace and pick a primary use case.
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
        </section>
      ) : null}

      {stepIndex === 1 ? (
        <section className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-6">
          <h2 className="text-[18px] font-semibold text-[var(--workspace-fg)]">Invite teammates</h2>
          <p className="mt-2 text-[14px] text-[var(--workspace-muted-fg)]">
            Paste emails separated by commas or new lines. You can skip this step.
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
              className="flex-1 rounded-xl border border-[var(--workspace-border)] px-4 py-3 text-[14px] font-medium"
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
        </section>
      ) : null}

      {stepIndex === 2 ? (
        <section className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-6">
          <h2 className="text-[18px] font-semibold text-[var(--workspace-fg)]">Connect an integration</h2>
          <p className="mt-2 text-[14px] text-[var(--workspace-muted-fg)]">
            Connect Slack, Gmail, Notion, Zoom, or Microsoft Teams from the integrations page, or skip for now.
          </p>
          <Link
            href="/workspace/integrations"
            className="mt-4 inline-flex w-full justify-center rounded-xl border border-[var(--workspace-border)] px-4 py-3 text-[14px] font-medium text-[var(--workspace-fg)]"
          >
            Open integrations
          </Link>
          <button
            type="button"
            disabled={busy}
            className="mt-3 w-full rounded-xl bg-[var(--workspace-accent)] px-4 py-3 text-[14px] font-semibold text-[var(--workspace-accent-fg)]"
            onClick={() => void saveIntegration(false)}
          >
            I connected one — continue
          </button>
          <button
            type="button"
            disabled={busy}
            className="mt-2 w-full text-[13px] text-[var(--workspace-muted-fg)] underline"
            onClick={() => void saveIntegration(true)}
          >
            Skip for now
          </button>
        </section>
      ) : null}

      {stepIndex === 3 ? (
        <section className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-6">
          <h2 className="text-[18px] font-semibold text-[var(--workspace-fg)]">Your first commitment</h2>
          <input
            className="mt-4 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 px-3 py-2 text-[14px] text-[var(--workspace-fg)]"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Your first commitment"
          />
          <input
            type="date"
            className="mt-3 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 px-3 py-2 text-[14px] text-[var(--workspace-fg)]"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          <select
            className="mt-3 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 px-3 py-2 text-[14px] text-[var(--workspace-fg)]"
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button
            type="button"
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-[var(--workspace-accent)] px-4 py-3 text-[14px] font-semibold text-[var(--workspace-accent-fg)]"
            onClick={() => void createFirstCommitment()}
          >
            Create commitment
          </button>
        </section>
      ) : null}

      {stepIndex === 4 ? (
        <section className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
          <h2 className="mt-4 text-[18px] font-semibold text-[var(--workspace-fg)]">You&apos;re ready</h2>
          <p className="mt-2 text-[14px] text-[var(--workspace-muted-fg)]">
            Head to your dashboard to track execution health.
          </p>
          <button
            type="button"
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-[var(--workspace-accent)] px-4 py-3 text-[14px] font-semibold text-[var(--workspace-accent-fg)]"
            onClick={() => void finish()}
          >
            Go to dashboard
          </button>
        </section>
      ) : null}
    </div>
  );
}
