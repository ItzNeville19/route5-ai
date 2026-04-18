"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, FolderKanban, X } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { deskUrl, DEFAULT_DESK_PRESET_ID } from "@/lib/desk-routes";
import { EXTRACTION_PRESETS } from "@/lib/extraction-presets";
import type { Project } from "@/lib/types";

/** Single-character markers (no emoji) — API stores first grapheme as project icon. */
const ICON_MARKERS = ["", "◆", "◇", "●", "■", "▸"] as const;

const STEPS = 3 as const;

type Step = 1 | 2 | 3;

export default function NewProjectModal() {
  const { t } = useI18n();
  const router = useRouter();
  const { pushToast, shellModifierClass } = useWorkspaceExperience();
  const { refreshAll } = useWorkspaceData();

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [iconMarker, setIconMarker] = useState("");
  const [presetId, setPresetId] = useState<string | null>(DEFAULT_DESK_PRESET_ID);
  const [openCaptureAfter, setOpenCaptureAfter] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const reset = useCallback(() => {
    setStep(1);
    setName("");
    setIconMarker("");
    setPresetId(DEFAULT_DESK_PRESET_ID);
    setOpenCaptureAfter(false);
    setError(null);
    setCreating(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(reset, 300);
  }, [reset]);

  useEffect(() => {
    const onOpen = () => {
      reset();
      setOpen(true);
    };
    window.addEventListener("route5:new-project-open", onOpen);
    return () => window.removeEventListener("route5:new-project-open", onOpen);
  }, [reset]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHash = () => {
      if (window.location.hash === "#new-project") {
        window.dispatchEvent(new Event("route5:new-project-open"));
      }
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  async function createProject() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    setCreating(true);
    try {
      const icon = iconMarker.trim();
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: trimmed,
          ...(icon ? { iconEmoji: icon } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        project?: Project;
      };
      if (!res.ok) {
        if (res.status === 403 && data.code === "LIMIT_PROJECTS") {
          setError(
            t("modal.newProject.errorLimit", {
              error: data.error ?? t("modal.newProject.projectLimitDefault"),
            })
          );
          return;
        }
        setError(data.error ?? t("modal.newProject.errorCreate"));
        return;
      }
      const pid = data.project?.id;
      if (pid) {
        const url = `${window.location.origin}/projects/${pid}`;
        try {
          await navigator.clipboard.writeText(url);
          pushToast(t("modal.newProject.toastCopied"), "success");
        } catch {
          pushToast(t("modal.newProject.toastCreated"), "success");
        }
        await refreshAll();
        close();
        if (openCaptureAfter) {
          router.push(
            deskUrl({
              projectId: pid,
              ...(presetId === null ? { preset: null } : { preset: presetId }),
            }),
            { scroll: true }
          );
        } else {
          router.push(`/projects/${pid}${presetId ? `?preset=${encodeURIComponent(presetId)}` : ""}`, {
            scroll: true,
          });
        }
      }
    } catch {
      setError(t("modal.newProject.errorCreate"));
    } finally {
      setCreating(false);
    }
  }

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <>
      {open ? (
        <div
          className="fixed inset-0 z-[70000] flex items-end justify-center sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-label={t("modal.newProject.close")}
            onClick={close}
          />
          <div
            className={`theme-route5-command theme-agent-shell relative z-[1] flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.25rem] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] text-[var(--workspace-fg)] shadow-2xl sm:rounded-2xl ${shellModifierClass}`}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-[var(--workspace-border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--workspace-accent)]/15">
                  <FolderKanban className="h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--workspace-muted-fg)]">
                    {t("modal.newProject.stepOf", { step, total: STEPS })}
                  </p>
                  <h2 id="new-project-modal-title" className="text-[17px] font-semibold text-[var(--workspace-fg)]">
                    {t("modal.newProject.title")}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-full p-2 text-[var(--workspace-muted-fg)] hover:bg-[var(--workspace-nav-hover)]"
                aria-label={t("modal.newProject.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {step === 1 ? (
                <div className="space-y-4">
                  <p className="text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
                    {t("modal.newProject.step1Intro")}
                  </p>
                  <div>
                    <label className="text-[12px] font-medium text-[var(--workspace-muted-fg)]">
                      {t("modal.newProject.icon")}
                    </label>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={iconMarker}
                        onChange={(e) => setIconMarker([...e.target.value].slice(0, 1).join(""))}
                        className="flex h-11 w-11 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] text-center font-mono text-[18px] text-[var(--workspace-fg)]"
                        maxLength={8}
                        aria-label={t("modal.newProject.projectIconAria")}
                        placeholder="—"
                      />
                      {ICON_MARKERS.filter(Boolean).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setIconMarker(m)}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border font-mono text-[15px] ${
                            iconMarker === m
                              ? "border-[var(--workspace-accent)]/50 bg-[var(--workspace-accent)]/10 text-[var(--workspace-fg)]"
                              : "border-[var(--workspace-border)] text-[var(--workspace-muted-fg)]"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="npm-name" className="text-[12px] font-medium text-[var(--workspace-muted-fg)]">
                      {t("modal.newProject.projectName")}
                    </label>
                    <input
                      id="npm-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("modal.newProject.namePlaceholder")}
                      className="mt-2 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-4 py-3 text-[15px] text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:border-[var(--workspace-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/15"
                      autoFocus
                    />
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-3">
                  <p className="text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
                    {t("modal.newProject.step2Intro")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPresetId(null)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-[14px] ${
                      presetId === null
                        ? "border-[var(--workspace-accent)]/45 bg-[var(--workspace-accent)]/10"
                        : "border-[var(--workspace-border)]"
                    }`}
                  >
                    <span className="font-medium text-[var(--workspace-fg)]">
                      {t("modal.newProject.templateBlank")}
                    </span>
                    {presetId === null ? <Check className="h-4 w-4 text-[var(--workspace-accent)]" /> : null}
                  </button>
                  <div className="grid max-h-[280px] gap-2 overflow-y-auto sm:max-h-[320px]">
                    {EXTRACTION_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPresetId(p.id)}
                        className={`flex w-full items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-left ${
                          presetId === p.id
                            ? "border-[var(--workspace-accent)]/45 bg-[var(--workspace-accent)]/10"
                            : "border-[var(--workspace-border)]"
                        }`}
                      >
                        <span>
                          <span className="block text-[14px] font-semibold text-[var(--workspace-fg)]">
                            {t(`desk.preset.${p.id}.label`)}
                          </span>
                          <span className="mt-0.5 block text-[12px] text-[var(--workspace-muted-fg)]">
                            {t(`desk.preset.${p.id}.use`)}
                          </span>
                        </span>
                        {presetId === p.id ? <Check className="h-4 w-4 shrink-0 text-[var(--workspace-accent)]" /> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-4">
                  <p className="text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
                    {t("modal.newProject.step3Intro")}
                  </p>
                  <div className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 px-3 py-3 text-[13px]">
                    <p>
                      <span className="font-semibold text-[var(--workspace-fg)]">
                        {name.trim() || t("modal.newProject.untitled")}
                      </span>
                      {iconMarker ? <span className="ml-2 font-mono text-[var(--workspace-muted-fg)]">{iconMarker}</span> : null}
                    </p>
                    <p className="mt-1 text-[var(--workspace-muted-fg)]">
                      {t("modal.newProject.templateLabel")}{" "}
                      {presetId
                        ? t(`desk.preset.${presetId}.label`)
                        : t("modal.newProject.templateBlank")}
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--workspace-border)] px-3 py-3">
                    <input
                      type="checkbox"
                      checked={openCaptureAfter}
                      onChange={(e) => setOpenCaptureAfter(e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-[14px] font-medium text-[var(--workspace-fg)]">
                        {t("modal.newProject.openCaptureAfter")}
                      </span>
                      <span className="block text-[12px] text-[var(--workspace-muted-fg)]">
                        {t("modal.newProject.openCaptureAfterHint")}
                      </span>
                    </span>
                  </label>
                  {error ? (
                    <p className="text-[13px] text-[var(--workspace-danger-fg,#b91c1c)]" role="alert">
                      {error}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--workspace-border)] px-4 py-3">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
                  className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-[14px] font-medium text-[var(--workspace-muted-fg)] hover:bg-[var(--workspace-nav-hover)]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t("modal.newProject.back")}
                </button>
              ) : (
                <span />
              )}
              {step < 3 ? (
                <button
                  type="button"
                  disabled={step === 1 && !name.trim()}
                  onClick={() => setStep((s) => (s < 3 ? ((s + 1) as Step) : s))}
                  className="inline-flex items-center gap-1 rounded-xl bg-[var(--workspace-fg)] px-4 py-2.5 text-[14px] font-semibold text-[var(--workspace-canvas)] disabled:opacity-40"
                >
                  {t("modal.newProject.continue")}
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={creating || !name.trim()}
                  onClick={() => void createProject()}
                  className="inline-flex items-center gap-1 rounded-xl bg-[var(--workspace-fg)] px-4 py-2.5 text-[14px] font-semibold text-[var(--workspace-canvas)] disabled:opacity-40"
                >
                  {creating ? t("modal.newProject.creating") : t("modal.newProject.create")}
                </button>
              )}
            </footer>
          </div>
        </div>
      ) : null}
    </>,
    document.body
  );
}
