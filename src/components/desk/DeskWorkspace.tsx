"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Clock,
  Figma,
  Github,
  Keyboard,
  LayoutGrid,
  Loader2,
  MessageSquare,
  Plug2,
  Send,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { EXTRACTION_PRESETS, getExtractionPreset } from "@/lib/extraction-presets";
import type { Project } from "@/lib/types";
import type { RecentExtractionRow } from "@/lib/workspace-summary";

const MAX_CHARS = 100_000;

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DeskWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectId, setProjectId] = useState<string>("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [recent, setRecent] = useState<RecentExtractionRow[]>([]);

  const presetId = searchParams.get("preset") ?? "";

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch("/api/projects", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { projects?: Project[] };
      const list = res.ok ? (data.projects ?? []) : [];
      setProjects(list);
      setProjectId((prev) => {
        if (prev && list.some((p) => p.id === prev)) return prev;
        return list[0]?.id ?? "";
      });
    } catch {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/workspace/summary", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        recent?: RecentExtractionRow[];
      };
      if (res.ok) setRecent(data.recent ?? []);
      else setRecent([]);
    } catch {
      setRecent([]);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
    void loadSummary();
  }, [loadProjects, loadSummary]);

  useEffect(() => {
    const pid = searchParams.get("projectId");
    if (pid && projects.some((p) => p.id === pid)) {
      setProjectId(pid);
    }
  }, [searchParams, projects]);

  useEffect(() => {
    if (!presetId) return;
    const p = getExtractionPreset(presetId);
    if (p?.body) {
      setText(p.body);
    }
  }, [presetId]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    const rawInput = text.trim();
    if (!projectId) {
      setError("Pick or create a project first.");
      return;
    }
    if (!rawInput) {
      setError("Add something to capture — paste, notes, or a link.");
      return;
    }
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ projectId, rawInput: rawInput.slice(0, MAX_CHARS) }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Couldn’t run extraction.");
        return;
      }
      setText("");
      setSuccess(true);
      window.setTimeout(() => setSuccess(false), 5000);
      void loadSummary();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-[1100px]">
        <motion.div
          className="dashboard-pro-hero relative overflow-hidden"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="dashboard-pro-aurora" aria-hidden />
          <div className="relative z-[2] px-6 pb-8 pt-9 sm:px-9 sm:pt-10">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--workspace-muted-fg)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--workspace-accent)]" aria-hidden />
              Your desk
            </p>
            <h1 className="mt-2 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold tracking-[-0.04em] text-[var(--workspace-fg)]">
              Capture → extract → ship
            </h1>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
              One place to paste context, run structured extractions, and jump to Linear, GitHub, or
              design review — without hunting through the rest of the app.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/integrations/linear"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 px-3 py-2 text-[12px] font-medium text-[var(--workspace-fg)] shadow-sm transition hover:border-[var(--workspace-accent)]/35"
              >
                <Plug2 className="h-3.5 w-3.5 opacity-80" aria-hidden />
                Linear
              </Link>
              <Link
                href="/integrations/github"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 px-3 py-2 text-[12px] font-medium text-[var(--workspace-fg)] shadow-sm transition hover:border-[var(--workspace-accent)]/35"
              >
                <Github className="h-3.5 w-3.5 opacity-80" aria-hidden />
                GitHub
              </Link>
              <Link
                href="/integrations/figma"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 px-3 py-2 text-[12px] font-medium text-[var(--workspace-fg)] shadow-sm transition hover:border-[var(--workspace-accent)]/35"
              >
                <Figma className="h-3.5 w-3.5 opacity-80" aria-hidden />
                Figma
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 px-3 py-2 text-[12px] font-medium text-[var(--workspace-fg)] shadow-sm transition hover:border-[var(--workspace-accent)]/35"
              >
                <LayoutGrid className="h-3.5 w-3.5 opacity-80" aria-hidden />
                Marketplace
              </Link>
              <button
                type="button"
                onClick={() => router.push("/projects?tool=palette")}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 px-3 py-2 text-[12px] font-medium text-[var(--workspace-fg)] shadow-sm"
              >
                <Keyboard className="h-3.5 w-3.5 opacity-80" aria-hidden />
                ⌘K
              </button>
            </div>
          </div>
        </motion.div>

        <section className="dashboard-pro-card mt-8 p-6 sm:p-8" aria-labelledby="capture-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="capture-heading"
                className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]"
              >
                Capture &amp; create
              </h2>
              <p className="mt-1 text-[17px] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]">
                Chat-style input — runs a full extraction on the project you pick
              </p>
            </div>
            <Link
              href="/projects#new-project"
              className="shrink-0 text-[13px] font-semibold text-[var(--workspace-accent)] hover:underline"
            >
              + New project
            </Link>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="desk-project">
              Project
            </label>
            <select
              id="desk-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={loadingProjects || projects.length === 0}
              className="min-h-[48px] w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-4 text-[15px] text-[var(--workspace-fg)] sm:max-w-sm"
            >
              {projects.length === 0 ? (
                <option value="">— Create a project first —</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
            {selectedProject ? (
              <Link
                href={`/projects/${selectedProject.id}`}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--workspace-muted-fg)] hover:text-[var(--workspace-fg)]"
              >
                Open project
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {EXTRACTION_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  router.replace(`/desk?preset=${encodeURIComponent(p.id)}`, { scroll: false });
                  setText(p.body);
                }}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition ${
                  presetId === p.id
                    ? "border-[var(--workspace-accent)] bg-[var(--workspace-accent)]/10 text-[var(--workspace-fg)]"
                    : "border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/80 text-[var(--workspace-muted-fg)] hover:border-[var(--workspace-accent)]/25"
                }`}
                title={p.use}
              >
                {p.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleExtract} className="mt-5">
            <label htmlFor="desk-capture" className="sr-only">
              Capture text
            </label>
            <textarea
              id="desk-capture"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste threads, specs, comments, Figma feedback, incident notes…"
              rows={10}
              maxLength={MAX_CHARS}
              className="min-h-[220px] w-full resize-y rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-4 py-4 text-[15px] leading-relaxed text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:border-[var(--workspace-accent)]/45 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/18"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-[var(--workspace-muted-fg)]">
                {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
              </p>
              <button
                type="submit"
                disabled={loading || !projectId || !text.trim()}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--workspace-fg)] px-5 text-[14px] font-semibold text-[var(--workspace-canvas)] shadow-md transition hover:opacity-95 disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                Run extraction
              </button>
            </div>
            {error ? (
              <p className="mt-3 text-[13px] text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            {success && selectedProject ? (
              <p className="mt-3 text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
                Saved to {selectedProject.name}.{" "}
                <Link
                  href={`/projects/${projectId}#extractions-section`}
                  className="font-semibold underline underline-offset-2"
                >
                  View extraction
                </Link>
              </p>
            ) : null}
          </form>
        </section>

        <section className="mt-10" aria-labelledby="recent-desk-heading">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2
              id="recent-desk-heading"
              className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]"
            >
              Recent extractions
            </h2>
            <Link href="/projects" className="text-[13px] font-semibold text-[var(--workspace-accent)]">
              All projects
            </Link>
          </div>
          {summaryLoading ? (
            <p className="text-[13px] text-[var(--workspace-muted-fg)]">Loading…</p>
          ) : recent.length === 0 ? (
            <div className="dashboard-pro-card px-6 py-10 text-center">
              <MessageSquare className="mx-auto h-6 w-6 text-[var(--workspace-muted-fg)]" aria-hidden />
              <p className="mt-3 text-[14px] text-[var(--workspace-muted-fg)]">
                No runs yet — capture something above.
              </p>
            </div>
          ) : (
            <ul className="dashboard-pro-card divide-y divide-[var(--workspace-border)] overflow-hidden p-0">
              {recent.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/projects/${r.projectId}#extractions-section`}
                    className="flex gap-4 px-6 py-4 transition hover:bg-[var(--workspace-canvas)]/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)]">
                        {r.projectName}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[14px] text-[var(--workspace-fg)]">
                        {r.summarySnippet}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-[11px] text-[var(--workspace-muted-fg)]">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {formatRelative(r.createdAt)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
