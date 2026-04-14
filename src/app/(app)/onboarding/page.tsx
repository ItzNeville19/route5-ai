"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { BrandSquircle } from "@/components/marketplace/brand-icons";
import { markOnboardingComplete } from "@/lib/onboarding-storage";
import { deskUrl } from "@/lib/desk-routes";
import { PRODUCT_HONEST, PRODUCT_INTEGRATIONS } from "@/lib/product-truth";
import type { Project } from "@/lib/types";

/** Steps 0–5 inclusive */
const STEP_TOTAL = 6;

type Health = {
  ok?: boolean;
  openaiConfigured?: boolean;
  supabaseConfigured?: boolean;
  storageBackend?: "supabase" | "sqlite";
  storageReady?: boolean;
  extractionMode?: "ai" | "offline";
};

const ease = [0.22, 1, 0.36, 1] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const [step, setStep] = useState(0);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [projectName, setProjectName] = useState("Client program — pilot");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdProject, setCreatedProject] = useState<Project | null>(null);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/health", { credentials: "same-origin" });
      if (res.ok) setHealth((await res.json()) as Health);
    } catch {
      setHealth({});
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 1) void loadHealth();
  }, [step, loadHealth]);

  async function handleCreateProject() {
    const name = projectName.trim();
    if (!name) return;
    setCreateError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        project?: Project;
      };
      if (!res.ok) {
        setCreateError(
          data.error ??
            "We couldn’t create that project. Try again in a moment — if it keeps happening, open Health from the dashboard."
        );
        return;
      }
      if (data.project) setCreatedProject(data.project);
      setStep(3);
    } catch {
      setCreateError("Something went wrong on our side. Check your connection and try again.");
    } finally {
      setCreating(false);
    }
  }

  function finish() {
    if (!userId) return;
    markOnboardingComplete(userId);
    router.push(deskUrl());
  }

  function skip() {
    finish();
  }

  const firstName =
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "there";

  if (!isLoaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" aria-hidden />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex max-w-[280px] gap-1.5" aria-hidden>
          {Array.from({ length: STEP_TOTAL }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-neutral-900" : "bg-neutral-200"
              }`}
              style={{ maxWidth: 48 }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={skip}
          className="shrink-0 text-[13px] font-medium text-neutral-500 transition hover:text-neutral-800"
        >
          Skip setup
        </button>
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.section
            key="s0"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-600 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden />
              Quick start
            </div>
            <h1 className="text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-[-0.04em] text-neutral-900">
              Hi {firstName} — here&apos;s your map
            </h1>
            <p className="max-w-xl text-[16px] leading-relaxed text-neutral-600">
              {PRODUCT_HONEST.oneLine} Use the sidebar: <strong className="text-neutral-900">Start here</strong>{" "}
              opens this guide anytime; <strong className="text-neutral-900">App library</strong> lists every screen;
              <strong className="text-neutral-900"> History</strong> shows recent extractions.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link
                href="/projects"
                className="rounded-2xl border border-black/[0.08] bg-white px-4 py-4 text-center text-[14px] font-semibold text-neutral-900 shadow-sm transition hover:border-neutral-300"
              >
                Dashboard
              </Link>
              <Link
                href={deskUrl()}
                className="rounded-2xl border border-black/[0.08] bg-white px-4 py-4 text-center text-[14px] font-semibold text-neutral-900 shadow-sm transition hover:border-neutral-300"
              >
                Desk
              </Link>
              <Link
                href="/marketplace"
                className="rounded-2xl border border-black/[0.08] bg-white px-4 py-4 text-center text-[14px] font-semibold text-neutral-900 shadow-sm transition hover:border-neutral-300"
              >
                Marketplace
              </Link>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-[15px] font-medium text-white shadow-lg shadow-neutral-900/20 transition hover:bg-neutral-800"
              >
                Deep setup (optional)
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={skip}
                className="inline-flex items-center gap-2 rounded-xl border border-black/[0.1] bg-white px-6 py-3 text-[15px] font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50"
              >
                Go to workspace
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </motion.section>
        )}

        {step === 1 && (
          <motion.section
            key="s1"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease }}
            className="space-y-6"
          >
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-neutral-900">
              Your stack
            </h2>
            <p className="text-[15px] leading-relaxed text-neutral-600">
              Pulled from the same health check the dashboard uses — refresh if you just changed
              environment variables.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadHealth()}
                disabled={healthLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${healthLoading ? "animate-spin" : ""}`}
                  aria-hidden
                />
                Refresh status
              </button>
              <a
                href="/api/health"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50"
              >
                Raw JSON
                <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden />
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/[0.06] bg-white/90 p-4 shadow-sm">
                <BrandSquircle id="supabase" sizeClass="h-11 w-11" className="mb-3" />
                <div className="text-[13px] font-semibold text-neutral-900">Database</div>
                <p className="mt-2 text-[13px] leading-snug text-neutral-600">
                  {health === null && !healthLoading
                    ? "Load status…"
                    : health?.storageBackend === "supabase"
                      ? "Cloud (Supabase) — projects and extractions sync to your workspace."
                      : "Embedded SQLite — projects and extractions stay on this machine."}
                </p>
              </div>
              <div className="rounded-2xl border border-black/[0.06] bg-white/90 p-4 shadow-sm">
                <BrandSquircle id="openai" sizeClass="h-11 w-11" className="mb-3" />
                <div className="text-[13px] font-semibold text-neutral-900">Extraction</div>
                <p className="mt-2 text-[13px] leading-snug text-neutral-600">
                  {health === null && !healthLoading
                    ? "Load status…"
                    : health?.extractionMode === "ai"
                      ? "AI extraction — structured output from your notes."
                      : health?.extractionMode === "offline"
                        ? "Built-in extraction — runs locally, no account steps."
                        : "AI extraction when your workspace enables it; heuristic path otherwise."}
                </p>
              </div>
              <div className="rounded-2xl border border-black/[0.06] bg-white/90 p-4 shadow-sm">
                <BrandSquircle id="clerk" sizeClass="h-11 w-11" className="mb-3" />
                <div className="text-[13px] font-semibold text-neutral-900">Account</div>
                <p className="mt-2 text-[13px] leading-snug text-neutral-600">
                  You&apos;re signed in with Clerk — profile and security live under Settings.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-[15px] font-medium text-white transition hover:bg-neutral-800"
              >
                Continue
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
              <Link
                href="/settings"
                className="inline-flex items-center rounded-xl border border-black/[0.08] bg-white px-5 py-3 text-[15px] font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50"
              >
                Open account settings
              </Link>
            </div>
          </motion.section>
        )}

        {step === 2 && (
          <motion.section
            key="s2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease }}
            className="space-y-6"
          >
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-neutral-900">
              Name your first program or account
            </h2>
            <p className="text-[15px] leading-relaxed text-neutral-600">
              Projects scope every commitment and action — same as the dashboard. We&apos;ll open it
              when it&apos;s ready so you can paste operational text and run a pass.
            </p>
            <label className="block">
              <span className="text-[13px] font-medium text-neutral-700">
                Project name
              </span>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-black/[0.1] bg-white px-4 py-3 text-[16px] text-neutral-900 shadow-inner outline-none ring-0 transition focus:border-neutral-400"
                placeholder="e.g. Acme contract · Region North"
                autoComplete="off"
              />
            </label>
            {createError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-900">
                {createError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleCreateProject()}
                disabled={creating || !projectName.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-[15px] font-medium text-white transition hover:bg-neutral-800 disabled:opacity-40"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Creating…
                  </>
                ) : (
                  <>
                    Create project
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-xl px-4 py-3 text-[15px] font-medium text-neutral-600 transition hover:text-neutral-900"
              >
                Skip — I&apos;ll create later
              </button>
            </div>
          </motion.section>
        )}

        {step === 3 && (
          <motion.section
            key="s3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease }}
            className="space-y-6"
          >
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-neutral-900">
              Integrations &amp; company
            </h2>
            <p className="text-[15px] leading-relaxed text-neutral-600">
              These pages are live in the app — the marketplace separates what&apos;s wired today from
              what&apos;s on the roadmap.
            </p>
            <div className="flex flex-wrap gap-3">
              <BrandSquircle id="clerk" sizeClass="h-10 w-10" />
              <BrandSquircle id="supabase" sizeClass="h-10 w-10" />
              <BrandSquircle id="openai" sizeClass="h-10 w-10" />
              <BrandSquircle id="linear" sizeClass="h-10 w-10" />
              <BrandSquircle id="github" sizeClass="h-10 w-10" />
              <BrandSquircle id="route5" sizeClass="h-10 w-10" />
            </div>
            <ul className="space-y-3 rounded-2xl border border-indigo-200/60 bg-indigo-50/40 p-5 text-[14px] leading-relaxed text-neutral-800">
              <li>
                <strong className="text-indigo-950">Shipped:</strong> {PRODUCT_INTEGRATIONS.clerk}
              </li>
              <li>{PRODUCT_INTEGRATIONS.data}</li>
              <li>{PRODUCT_INTEGRATIONS.intelligence}</li>
              <li>{PRODUCT_INTEGRATIONS.linear}</li>
              <li>{PRODUCT_INTEGRATIONS.github}</li>
            </ul>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/marketplace"
                className="group flex items-center justify-between rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm transition hover:border-black/[0.12] hover:shadow-md"
              >
                <span className="font-medium text-neutral-900">Marketplace &amp; status</span>
                <ArrowRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/pricing"
                className="group flex items-center justify-between rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm transition hover:border-black/[0.12] hover:shadow-md"
              >
                <span className="font-medium text-neutral-900">Pricing</span>
                <ArrowRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/contact"
                className="group flex items-center justify-between rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm transition hover:border-black/[0.12] hover:shadow-md"
              >
                <span className="font-medium text-neutral-900">Contact sales</span>
                <ArrowRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/docs/product"
                className="group flex items-center justify-between rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm transition hover:border-black/[0.12] hover:shadow-md"
              >
                <span className="font-medium text-neutral-900">What we ship</span>
                <ArrowRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-[15px] font-medium text-white transition hover:bg-neutral-800"
            >
              Continue
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </motion.section>
        )}

        {step === 4 && (
          <motion.section
            key="s4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease }}
            className="space-y-6"
          >
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-neutral-900">
              Run an extraction
            </h2>
            <p className="text-[15px] leading-relaxed text-neutral-600">
              Open a project, paste notes or tickets, then choose{" "}
              <strong className="font-medium text-neutral-800">Run extraction</strong>.{" "}
              When AI extraction is on you get structured output; otherwise the built-in heuristic runs.
            </p>
            {createdProject ? (
              <Link
                href={`/projects/${createdProject.id}`}
                className="flex items-center justify-between rounded-2xl border border-[var(--workspace-accent)]/25 bg-[var(--workspace-accent)]/5 p-5 transition hover:border-[var(--workspace-accent)]/40"
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--workspace-accent)]">
                    Your new project
                  </p>
                  <p className="mt-1 text-[17px] font-semibold text-neutral-900">
                    {createdProject.name}
                  </p>
                  <p className="mt-1 text-[13px] text-neutral-600">
                    Open it and use the input panel at the top.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-[var(--workspace-accent)]" aria-hidden />
              </Link>
            ) : (
              <Link
                href="/projects#new-project"
                className="flex items-center justify-between rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm transition hover:border-black/[0.14]"
              >
                <div>
                  <p className="text-[15px] font-semibold text-neutral-900">
                    Create a project on the dashboard
                  </p>
                  <p className="mt-1 text-[13px] text-neutral-600">
                    Name a project, open it, then paste text and extract.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-neutral-400" aria-hidden />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setStep(5)}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-[15px] font-medium text-white transition hover:bg-neutral-800"
            >
              Finish setup
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </motion.section>
        )}

        {step === 5 && (
          <motion.section
            key="s5"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease }}
            className="space-y-6 text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" aria-hidden />
            </div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-900">
              You&apos;re ready
            </h2>
            <p className="mx-auto max-w-md text-[15px] leading-relaxed text-neutral-600">
              Your workspace uses the same production routes as the rest of Route5.
              Use the command palette (⌘K) anytime, or revisit{" "}
              <Link href="/marketplace" className="font-medium text-neutral-900 underline-offset-4 hover:underline">
                Marketplace
              </Link>{" "}
              for live status.
            </p>
            <button
              type="button"
              onClick={finish}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-8 py-3.5 text-[16px] font-medium text-white shadow-lg shadow-neutral-900/15 transition hover:bg-neutral-800"
            >
              Go to dashboard
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
