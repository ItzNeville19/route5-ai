"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Github,
  Inbox,
  Keyboard,
  LayoutGrid,
  ListTodo,
  Loader2,
  Plug2,
  Send,
  Settings,
  Sparkles,
  BarChart3,
  Shield,
  Tag,
  Zap,
} from "lucide-react";
import { useCommandPalette } from "@/components/CommandPalette";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import DeskCaptureToolbar from "@/components/desk/DeskCaptureToolbar";
import DeskOpenActions from "@/components/desk/DeskOpenActions";
import DeskShortcutsModal from "@/components/desk/DeskShortcutsModal";
import { deskCaptureStorageKey } from "@/lib/desk-storage";
import { deskUrl } from "@/lib/desk-routes";
import { DEFAULT_DESK_PRESET_ID } from "@/lib/positioning-wedge";
import {
  EXTRACTION_PRESETS,
  getExtractionPreset,
  PRESET_CATEGORY_ORDER,
} from "@/lib/extraction-presets";
import type { Extraction } from "@/lib/types";
import type { OpenActionRef, WorkspaceConnectorReadiness } from "@/lib/workspace-summary";
import { formatRelativeLong } from "@/lib/relative-time";
import {
  clearExtractionDraft,
  peekExtractionDraft,
} from "@/lib/workspace-bridge";

const MAX_CHARS = 100_000;

/** Desk URL preserving explicit `preset: null` (no template) vs default wedge preset. */
function buildDeskPath(opts: { projectId?: string | null; preset?: string | null }): string {
  const projectId = opts.projectId ?? undefined;
  if (opts.preset === null) return deskUrl({ projectId, preset: null });
  if (opts.preset?.trim()) return deskUrl({ projectId, preset: opts.preset.trim() });
  return deskUrl({ projectId });
}

function openNewProjectModal() {
  window.dispatchEvent(new Event("route5:new-project-open"));
}

function DeskStatusTile({
  icon,
  title,
  ok,
  okBadge,
  badBadge,
  body,
  href,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  ok: boolean;
  okBadge: string;
  badBadge: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/70 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 text-[var(--workspace-accent)]">
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--workspace-fg)]">{title}</p>
            <p
              className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                ok
                  ? "bg-emerald-500/12 text-[var(--workspace-success-fg)]"
                  : "bg-amber-500/10 text-[var(--workspace-muted-fg)]"
              }`}
            >
              {ok ? okBadge : badBadge}
            </p>
          </div>
        </div>
        <Link
          href={href}
          className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--workspace-accent)] hover:underline"
        >
          {cta}
        </Link>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">{body}</p>
    </div>
  );
}

function IntegrationTiles({
  readiness,
  t,
}: {
  readiness: WorkspaceConnectorReadiness | null;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const items: {
    id: string;
    title: string;
    href: string;
    ok: boolean;
    icon: React.ReactNode;
  }[] = [
    {
      id: "linear",
      title: "Linear",
      href: "/integrations/linear",
      ok: !!readiness?.linear,
      icon: <ListTodo className="h-4 w-4" aria-hidden />,
    },
    {
      id: "github",
      title: "GitHub",
      href: "/integrations/github",
      ok: !!readiness?.github,
      icon: <Github className="h-4 w-4" aria-hidden />,
    },
    {
      id: "figma",
      title: "Figma",
      href: "/integrations/figma",
      ok: !!readiness?.figma,
      icon: <LayoutGrid className="h-4 w-4" aria-hidden />,
    },
  ];

  return (
    <>
      {items.map((it) => (
        <DeskStatusTile
          key={it.id}
          icon={it.icon}
          title={it.title}
          ok={it.ok}
          okBadge={t("desk.ready")}
          badBadge={t("desk.off")}
          body={it.ok ? t("desk.statusIntegOn") : t("desk.statusIntegOff")}
          href={it.href}
          cta={it.ok ? t("desk.statusCtaOpen") : t("desk.statusCtaSetup")}
        />
      ))}
    </>
  );
}

export default function DeskWorkspace() {
  const { t, intlLocale } = useI18n();
  const { prefs, pushToast } = useWorkspaceExperience();
  const { projects, summary, loadingProjects, loadingSummary, refreshAll, refreshSummary } =
    useWorkspaceData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { open: openCommandPalette } = useCommandPalette();
  const [projectId, setProjectId] = useState<string>("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  /** Incremented when an integration draft lands in the capture field — triggers focus + highlight. */
  const [deskImportPulse, setDeskImportPulse] = useState(0);
  const [importGlow, setImportGlow] = useState(false);
  const captureRef = useRef<HTMLTextAreaElement | null>(null);
  const draftSaveTimer = useRef<number | null>(null);
  const projectDetailCache = useRef<Map<string, { extractions: Extraction[] }>>(new Map());

  const presetId = searchParams.get("preset") ?? "";

  const groupedPresets = useMemo(
    () =>
      PRESET_CATEGORY_ORDER.map((category) => ({
        category,
        presets: EXTRACTION_PRESETS.filter((p) => p.category === category).sort((a, b) => {
          if (a.id === DEFAULT_DESK_PRESET_ID) return -1;
          if (b.id === DEFAULT_DESK_PRESET_ID) return 1;
          return a.label.localeCompare(b.label);
        }),
      })),
    []
  );

  const wordCount = useMemo(() => {
    const raw = text.trim();
    if (!raw) return 0;
    return raw.split(/\s+/).filter(Boolean).length;
  }, [text]);

  const readMinutes = useMemo(
    () => (wordCount === 0 ? 0 : Math.max(1, Math.round(wordCount / 200))),
    [wordCount]
  );

  useEffect(() => {
    const pid = searchParams.get("projectId");
    if (pid && projects.some((p) => p.id === pid)) {
      setProjectId(pid);
      return;
    }
    setProjectId((prev) => {
      if (prev && projects.some((p) => p.id === prev)) return prev;
      return projects[0]?.id ?? "";
    });
  }, [searchParams, projects]);

  /** Wedge default: add Client program to URL when there is no saved draft (plan: primary Desk path). */
  useEffect(() => {
    if (searchParams.get("draft") === "1") return;
    if (searchParams.get("preset")) return;
    if (!projectId || loadingProjects) return;
    let hasDraft = false;
    try {
      hasDraft = Boolean(localStorage.getItem(deskCaptureStorageKey(projectId))?.trim());
    } catch {
      /* ignore */
    }
    if (hasDraft) return;
    router.replace(buildDeskPath({ projectId }), { scroll: false });
  }, [projectId, loadingProjects, searchParams, router]);

  useEffect(() => {
    if (searchParams.get("draft") === "1") return;
    if (presetId) {
      const p = getExtractionPreset(presetId);
      if (p?.body) setText(p.body);
      return;
    }
    if (!projectId) return;
    try {
      const s = localStorage.getItem(deskCaptureStorageKey(projectId));
      setText(s ?? "");
    } catch {
      setText("");
    }
  }, [projectId, presetId, searchParams]);

  useEffect(() => {
    if (!projectId) return;
    if (draftSaveTimer.current !== null) window.clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = window.setTimeout(() => {
      try {
        if (text.trim()) localStorage.setItem(deskCaptureStorageKey(projectId), text);
        else localStorage.removeItem(deskCaptureStorageKey(projectId));
      } catch {
        /* ignore */
      }
    }, 450);
    return () => {
      if (draftSaveTimer.current !== null) window.clearTimeout(draftSaveTimer.current);
    };
  }, [text, projectId]);

  /**
   * Integration → Desk: session draft must apply after projects resolve, and localStorage
   * for the target project must be updated before the effect above loads from disk — otherwise
   * the capture field stays empty (race with async /projects + Strict Mode).
   */
  useLayoutEffect(() => {
    if (searchParams.get("draft") !== "1") return;
    if (loadingProjects) return;

    const draft = peekExtractionDraft();
    const urlPid = searchParams.get("projectId");
    const targetPid =
      urlPid && projects.some((p) => p.id === urlPid)
        ? urlPid
        : projects[0]?.id ?? "";

    const mergeBody = (prev: string) => {
      if (!draft?.body?.trim()) return prev;
      const next = draft.body.trim();
      const base = prev.trim();
      return base ? `${base}\n\n${next}` : next;
    };

    if (!draft?.body?.trim()) {
      clearExtractionDraft();
      router.replace(
        buildDeskPath({
          projectId: urlPid ?? undefined,
          preset: presetId || null,
        }),
        { scroll: false }
      );
      return;
    }

    if (!targetPid) {
      setText((prev) => mergeBody(prev));
      clearExtractionDraft();
      router.replace(buildDeskPath({ preset: presetId || null }), { scroll: false });
      pushToast(t("desk.toastImportNeedProject", { source: draft.source }), "info");
      return;
    }

    const merged = mergeBody("");
    setProjectId(targetPid);
    setText(merged);
    try {
      localStorage.setItem(deskCaptureStorageKey(targetPid), merged);
    } catch {
      /* ignore */
    }
    clearExtractionDraft();
    router.replace(
      buildDeskPath({ projectId: targetPid, preset: presetId || null }),
      { scroll: false }
    );
    pushToast(t("desk.toastImportedFrom", { source: draft.source }), "success");
  }, [searchParams, loadingProjects, projects, presetId, router, pushToast, t]);

  useEffect(() => {
    const clear = () => projectDetailCache.current.clear();
    window.addEventListener("route5:project-updated", clear);
    return () => window.removeEventListener("route5:project-updated", clear);
  }, []);

  const completeOpenAction = useCallback(
    async (ref: OpenActionRef) => {
      let cached = projectDetailCache.current.get(ref.projectId)?.extractions;
      if (!cached) {
        const res = await fetch(`/api/projects/${ref.projectId}`, { credentials: "same-origin" });
        const data = (await res.json().catch(() => ({}))) as { extractions?: Extraction[] };
        if (!res.ok || !data.extractions) {
          pushToast(t("desk.openQueueError"), "error");
          return;
        }
        cached = data.extractions;
        projectDetailCache.current.set(ref.projectId, { extractions: cached });
      }
      const ex = cached.find((e) => e.id === ref.extractionId);
      if (!ex) {
        projectDetailCache.current.delete(ref.projectId);
        pushToast(t("desk.openQueueError"), "error");
        return;
      }
      const next = ex.actionItems.map((a) =>
        a.id === ref.actionId ? { ...a, completed: true } : a
      );
      const patch = await fetch(
        `/api/projects/${ref.projectId}/extractions/${ref.extractionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ actionItems: next }),
        }
      );
      if (!patch.ok) {
        projectDetailCache.current.delete(ref.projectId);
        pushToast(t("desk.openQueueError"), "error");
        return;
      }
      const updated = (await patch.json().catch(() => ({}))) as {
        actionItems?: Extraction["actionItems"];
      };
      if (updated.actionItems) {
        const list = cached.map((e) =>
          e.id === ref.extractionId ? { ...e, actionItems: updated.actionItems! } : e
        );
        projectDetailCache.current.set(ref.projectId, { extractions: list });
      }
      await refreshSummary();
      pushToast(t("desk.openQueueDone"), "success");
    },
    [pushToast, refreshSummary, t]
  );

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  const runsForProject = useMemo(
    () => summary.recent.filter((r) => r.projectId === projectId),
    [summary.recent, projectId]
  );

  const latestForProject = runsForProject[0];

  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    const rawInput = text.trim();
    if (!projectId) {
      setError(t("desk.errorChooseProject"));
      return;
    }
    if (!rawInput) {
      setError(t("desk.errorAddMaterial"));
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
        body: JSON.stringify({
          projectId,
          rawInput: rawInput.slice(0, MAX_CHARS),
          extractionProviderId: prefs.extractionProviderId ?? "auto",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("desk.errorExtractionFailed"));
        return;
      }
      setText("");
      try {
        localStorage.removeItem(deskCaptureStorageKey(projectId));
      } catch {
        /* ignore */
      }
      setSuccess(true);
      window.setTimeout(() => setSuccess(false), 5000);
      void refreshAll();
    } catch {
      setError(t("desk.errorNetwork"));
    } finally {
      setLoading(false);
    }
  }

  const readiness = summary.readiness;
  const aiOff = readiness && !readiness.openai;
  const hasProjects = projects.length > 0;

  async function handlePasteFromClipboard() {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip.trim()) {
        pushToast(t("desk.toastPasteFailed"), "info");
        return;
      }
      setText((prev) => {
        const base = prev.trim();
        return base ? `${base}\n\n${clip}` : clip;
      });
      pushToast(t("desk.toastPasted"), "success");
    } catch {
      pushToast(t("desk.toastPasteFailed"), "error");
    }
  }

  async function handleCopyAll() {
    const raw = text.trim();
    if (!raw) return;
    try {
      await navigator.clipboard.writeText(text);
      pushToast(t("desk.toastCopied"), "success");
    } catch {
      pushToast(t("desk.toastPasteFailed"), "error");
    }
  }

  function handleClearCapture() {
    setText("");
    try {
      if (projectId) localStorage.removeItem(deskCaptureStorageKey(projectId));
    } catch {
      /* ignore */
    }
  }

  function handleExportTxt() {
    const raw = text.trim();
    if (!raw) return;
    const slug = (selectedProject?.name ?? "capture")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `desk-${slug || "capture"}-${stamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast(t("desk.toastExport"), "success");
  }

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-[min(100%,1440px)] px-1 sm:px-0">
        {aiOff ? (
          <div
            className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-[13px] leading-relaxed text-[var(--workspace-fg)] sm:px-5"
            role="status"
          >
            <span className="font-semibold">{t("desk.llmOffTitle")}</span> {t("desk.llmOffLead")}{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5 text-[12px]">OPENAI_API_KEY</code>{" "}
            {t("desk.llmOffTail")}{" "}
            <Link
              href="/docs/product"
              className="font-medium text-[var(--workspace-accent)] underline-offset-2 hover:underline"
            >
              {t("desk.llmOffRead")}
            </Link>
          </div>
        ) : null}

        <header className="dashboard-home-card relative mb-6 overflow-hidden rounded-[24px] px-4 py-5 sm:px-6 sm:py-6">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            aria-hidden
            style={{
              background:
                "radial-gradient(900px 240px at 12% -20%, rgba(139,92,246,0.5), transparent 55%), radial-gradient(700px 200px at 92% 0%, rgba(56,189,248,0.35), transparent 50%)",
            }}
          />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/80 text-[var(--workspace-accent)] shadow-inner">
                <Inbox className="h-6 w-6" strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
                  {t("desk.badge")}
                </p>
                <h1 className="mt-1 text-[clamp(1.2rem,2.6vw,1.65rem)] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
                  {t("desk.heroTitle")}
                </h1>
                <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
                  {t("desk.heroBody")}
                </p>
                <p
                  className="mt-3 text-[13px] leading-relaxed text-[var(--workspace-fg)]/90"
                  aria-label={t("desk.pipelineAria")}
                >
                  <span className="font-medium text-[var(--workspace-accent)]">→</span>{" "}
                  {t("desk.pipelineOneLiner")}
                </p>
              </div>
            </div>
            <nav
              className="no-scrollbar flex max-w-full gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:justify-end lg:max-w-[min(100%,420px)]"
              aria-label={t("desk.badge")}
            >
              <Link
                href="/projects"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 px-3 py-2 text-[12px] font-medium text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35"
              >
                {t("desk.navOverview")}
                <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
              </Link>
              <Link
                href="/integrations"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 px-3 py-2 text-[12px] font-medium text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35"
              >
                <Plug2 className="h-3.5 w-3.5 opacity-80" aria-hidden />
                {t("sidebar.integrations")}
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 px-3 py-2 text-[12px] font-medium text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35"
              >
                <Settings className="h-3.5 w-3.5 opacity-80" aria-hidden />
                {t("desk.navSettings")}
              </Link>
              <Link
                href="/docs/product"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 px-3 py-2 text-[12px] font-medium text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35"
              >
                <BookOpen className="h-3.5 w-3.5 opacity-80" aria-hidden />
                {t("desk.navDocs")}
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 px-3 py-2 text-[12px] font-medium text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35"
              >
                <LayoutGrid className="h-3.5 w-3.5 opacity-80" aria-hidden />
                {t("desk.navMarketplace")}
              </Link>
              <button
                type="button"
                onClick={() => openCommandPalette()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 px-3 py-2 text-[12px] font-medium text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35"
              >
                <Keyboard className="h-3.5 w-3.5 opacity-80" aria-hidden />
                {t("desk.cmdK")}
              </button>
            </nav>
          </div>
        </header>

        <section className="mb-6" aria-labelledby="desk-status-heading">
          <h2 id="desk-status-heading" className="sr-only">
            {t("desk.statusHeading")}
          </h2>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)]">
            {t("desk.statusHeading")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DeskStatusTile
              icon={<Sparkles className="h-4 w-4" aria-hidden />}
              title={t("desk.statusAiTitle")}
              ok={!!readiness?.openai}
              okBadge={t("desk.statusBadgeOk")}
              badBadge={t("desk.statusBadgeNeeds")}
              body={readiness?.openai ? t("desk.statusAiOn") : t("desk.statusAiOff")}
              href="/settings"
              cta={readiness?.openai ? t("desk.statusCtaOpen") : t("desk.statusCtaSetup")}
            />
            <IntegrationTiles readiness={readiness} t={t} />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <aside className="dashboard-home-card space-y-5 rounded-[24px] p-4 sm:p-5 lg:col-span-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
                {t("desk.filedUnder")}
              </p>
              <label className="sr-only" htmlFor="desk-project-rail">
                {t("desk.projectLabel")}
              </label>
              <select
                id="desk-project-rail"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={loadingProjects || !hasProjects}
                className="mt-2 min-h-[44px] w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 text-[14px] text-[var(--workspace-fg)] focus:border-[var(--workspace-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/15"
              >
                {!hasProjects ? (
                  <option value="">{t("desk.createProjectFirst")}</option>
                ) : (
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.iconEmoji?.trim() ? `${p.iconEmoji.trim()} ${p.name}` : p.name}
                    </option>
                  ))
                )}
              </select>
              {selectedProject ? (
                <Link
                  href={`/projects/${selectedProject.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--workspace-accent)] hover:underline"
                >
                  {t("desk.projectWorkspace")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={openNewProjectModal}
                  className="mt-2 text-left text-[13px] font-semibold text-[var(--workspace-accent)] hover:underline"
                >
                  {t("desk.emptyNoProjectCta")}
                </button>
              )}
            </div>

            <div className="border-t border-[var(--workspace-border)] pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)]">
                {t("desk.howHeading")}
              </p>
              <ol className="mt-3 list-decimal space-y-2.5 pl-4 text-[12px] leading-relaxed text-[var(--workspace-muted-fg)] marker:text-[var(--workspace-accent)]">
                <li className="pl-1 text-[var(--workspace-fg)]">{t("desk.howStep1")}</li>
                <li className="pl-1">{t("desk.howStep2")}</li>
                <li className="pl-1">{t("desk.howStep3")}</li>
                <li className="pl-1">{t("desk.howStep4")}</li>
              </ol>
            </div>

            <div className="border-t border-[var(--workspace-border)] pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)]">
                {t("desk.resourcesHeading")}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
                {t("desk.resourcesLead")}
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="/account/plans"
                    className="flex items-center gap-2 rounded-lg px-1 py-1 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-canvas)]/60"
                  >
                    <Zap className="h-3.5 w-3.5 shrink-0 text-[var(--workspace-accent)]" aria-hidden />
                    {t("desk.resourcePlans")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="flex items-center gap-2 rounded-lg px-1 py-1 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-canvas)]/60"
                  >
                    <Tag className="h-3.5 w-3.5 shrink-0 text-[var(--workspace-accent)]" aria-hidden />
                    {t("desk.resourcePricing")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/reports"
                    className="flex items-center gap-2 rounded-lg px-1 py-1 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-canvas)]/60"
                  >
                    <BarChart3 className="h-3.5 w-3.5 shrink-0 text-[var(--workspace-accent)]" aria-hidden />
                    {t("desk.resourceReports")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="flex items-center gap-2 rounded-lg px-1 py-1 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-canvas)]/60"
                  >
                    <Send className="h-3.5 w-3.5 shrink-0 text-[var(--workspace-accent)]" aria-hidden />
                    {t("desk.resourceContact")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/trust"
                    className="flex items-center gap-2 rounded-lg px-1 py-1 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-canvas)]/60"
                  >
                    <Shield className="h-3.5 w-3.5 shrink-0 text-[var(--workspace-accent)]" aria-hidden />
                    {t("desk.resourceTrust")}
                  </Link>
                </li>
              </ul>
            </div>
          </aside>

          <div className="space-y-5 lg:col-span-6">
            {hasProjects && (loadingSummary || summary.extractionCount > 0) ? (
              <DeskOpenActions
                items={summary.openActions}
                locale={intlLocale}
                loadingSummary={loadingSummary}
                onToggleComplete={completeOpenAction}
                t={t}
              />
            ) : null}
            <section
              className={`dashboard-home-card desk-capture-focus rounded-[24px] p-5 sm:p-6 ${importGlow ? "desk-capture-import-glow" : ""}`}
              aria-labelledby="capture-heading"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2
                    id="capture-heading"
                    className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]"
                  >
                    {t("desk.inbox")}
                  </h2>
                  <p className="mt-1 text-[17px] font-semibold tracking-[-0.02em] text-[var(--workspace-fg)]">
                    {t("desk.captureTagline")}
                  </p>
                  <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
                    {t("desk.captureHelper")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openNewProjectModal}
                    className="shrink-0 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/80 px-3 py-1.5 text-[12px] font-semibold text-[var(--workspace-accent)] transition hover:bg-[var(--workspace-accent)]/10"
                  >
                    {t("desk.newProjectCta")}
                  </button>
                  <Link
                    href="/projects"
                    className="shrink-0 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/80 px-3 py-1.5 text-[12px] font-semibold text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
                  >
                    {t("desk.navOverview")}
                  </Link>
                </div>
              </div>

              {!hasProjects ? (
                <div className="mt-8 rounded-2xl border border-dashed border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 px-5 py-10 text-center">
                  <p className="text-[16px] font-semibold text-[var(--workspace-fg)]">{t("desk.emptyNoProjectTitle")}</p>
                  <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
                    {t("desk.emptyNoProjectBody")}
                  </p>
                  <button
                    type="button"
                    onClick={openNewProjectModal}
                    className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--workspace-fg)] px-6 text-[14px] font-semibold text-[var(--workspace-canvas)] shadow-md transition hover:opacity-95"
                  >
                    {t("desk.emptyNoProjectCta")}
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-5 space-y-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">
                      {t("desk.shapeTemplates")}
                    </p>
                    {groupedPresets.map(({ category, presets }) => (
                      <div key={category}>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted-fg)]">
                          {t(`desk.presetCategory.${category}`)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {presets.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                router.replace(buildDeskPath({ projectId, preset: p.id }), {
                                  scroll: false,
                                });
                                setText(p.body);
                              }}
                              className={`rounded-xl border px-3 py-2 text-left text-[12px] font-medium transition ${
                                presetId === p.id
                                  ? "border-[var(--workspace-accent)] bg-[var(--workspace-accent)]/10 text-[var(--workspace-fg)] shadow-sm"
                                  : "border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/80 text-[var(--workspace-muted-fg)] hover:border-[var(--workspace-accent)]/30 hover:text-[var(--workspace-fg)]"
                              }`}
                              title={t(`desk.preset.${p.id}.use`)}
                            >
                              {t(`desk.preset.${p.id}.label`)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={handleExtract}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        void handleExtract(e as unknown as React.FormEvent<HTMLFormElement>);
                      }
                    }}
                    className="mt-6"
                  >
                    <label htmlFor="desk-capture" className="sr-only">
                      {t("desk.workInput")}
                    </label>
                    <textarea
                      ref={captureRef}
                      id="desk-capture"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={t("desk.capturePlaceholder")}
                      rows={14}
                      maxLength={MAX_CHARS}
                      disabled={!projectId}
                      className="min-h-[280px] w-full resize-y rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-4 py-4 text-[15px] leading-relaxed text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:border-[var(--workspace-accent)]/45 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/18 disabled:opacity-50"
                    />
                    <DeskCaptureToolbar
                      disabled={!projectId}
                      wordCount={wordCount}
                      readMinutes={readMinutes}
                      onPaste={handlePasteFromClipboard}
                      onCopy={handleCopyAll}
                      onClear={handleClearCapture}
                      onExport={handleExportTxt}
                      onShortcuts={() => setShortcutsOpen(true)}
                      t={t}
                    />
                    <p className="mt-2 text-[11px] text-[var(--workspace-muted-fg)]">{t("desk.draftHint")}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[11px] tabular-nums text-[var(--workspace-muted-fg)]">
                        {t("desk.charCount", {
                          current: text.length.toLocaleString(intlLocale),
                          max: MAX_CHARS.toLocaleString(intlLocale),
                        })}
                      </p>
                      <button
                        type="submit"
                        disabled={loading || !projectId || !text.trim()}
                        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--workspace-fg)] px-6 text-[14px] font-semibold text-[var(--workspace-canvas)] shadow-md transition hover:opacity-95 disabled:opacity-40"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Send className="h-4 w-4" aria-hidden />
                        )}
                        {t("desk.runExtraction")}
                      </button>
                    </div>
                    {error ? (
                      <p className="mt-3 text-[13px] text-[var(--workspace-danger-fg)]" role="alert">
                        {error}
                      </p>
                    ) : null}
                    {success && selectedProject ? (
                      <p className="mt-4 flex flex-wrap items-center gap-2 text-[13px] font-medium text-[var(--workspace-success-fg)]">
                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                        <span>
                          {t("desk.savedTo", { name: selectedProject.name })}{" "}
                          <Link
                            href={`/projects/${projectId}#extractions-section`}
                            className="font-semibold underline underline-offset-2 hover:text-[var(--workspace-success-link-hover)]"
                          >
                            {t("desk.reviewRun")}
                          </Link>
                        </span>
                      </p>
                    ) : null}
                  </form>
                </>
              )}
            </section>
          </div>

          <aside className="dashboard-home-card space-y-3 rounded-[24px] p-4 sm:p-5 lg:col-span-3">
            <div className="flex items-center gap-2 text-[var(--workspace-fg)]">
              <ListTodo className="h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
                {t("desk.outcomesTitle")}
              </p>
            </div>
            {!hasProjects ? (
              <p className="text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
                {t("desk.emptyNoProjectBody")}
              </p>
            ) : latestForProject ? (
              <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 px-3 py-2.5 text-[12px]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                  {t("desk.latestRun")}
                </p>
                <p className="mt-1 font-medium text-[var(--workspace-fg)]">
                  {latestForProject.openActionsCount > 0
                    ? t("desk.openActionsOnRun", {
                        count: latestForProject.openActionsCount,
                      })
                    : t("desk.noOpenActionsOnRun")}
                </p>
                <p className="mt-1 line-clamp-2 text-[var(--workspace-muted-fg)]">{latestForProject.summarySnippet}</p>
              </div>
            ) : (
              <p className="text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">{t("desk.outcomesHint")}</p>
            )}
            {hasProjects ? (
              loadingSummary ? (
                <p className="text-[13px] text-[var(--workspace-muted-fg)]">{t("desk.loading")}</p>
              ) : runsForProject.length === 0 ? (
                <p className="text-[13px] text-[var(--workspace-muted-fg)]">{t("desk.noRunsProject")}</p>
              ) : (
                <ul className="max-h-[min(52vh,420px)] space-y-0 overflow-y-auto rounded-xl border border-[var(--workspace-border)] divide-y divide-[var(--workspace-border)]">
                  {runsForProject.slice(0, 12).map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/projects/${r.projectId}#extractions-section`}
                        className="block px-3 py-3 transition hover:bg-[var(--workspace-canvas)]/55"
                      >
                        <p className="line-clamp-2 text-[13px] text-[var(--workspace-fg)]">{r.summarySnippet}</p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--workspace-muted-fg)]">
                          <Clock className="h-3 w-3" aria-hidden />
                          {formatRelativeLong(r.createdAt, intlLocale)}
                          {r.openActionsCount > 0
                            ? ` ${t("desk.openCount", { count: r.openActionsCount })}`
                            : ""}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
            {hasProjects ? (
              <Link
                href={projectId ? `/projects/${projectId}#extractions-section` : "/projects"}
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--workspace-accent)] hover:underline"
              >
                {t("desk.fullHistory")}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
          </aside>
        </div>
      </div>

      <DeskShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} t={t} />
    </div>
  );
}
