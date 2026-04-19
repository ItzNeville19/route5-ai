"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FolderKanban, Loader2, X } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useBillingUpgrade } from "@/components/billing/BillingUpgradeProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import type { Project } from "@/lib/types";
import type { UpgradePromptPayload } from "@/lib/billing/types";

const ACTIVE_PROJECT_STORAGE_KEY = "route5.headerProjectId";

/**
 * New project as a native `<dialog>` (top layer) — avoids z-index / pointer-events
 * fights with the sidebar, command palette, and other overlays.
 */
export default function NewProjectModal() {
  const { t } = useI18n();
  const router = useRouter();
  const { pushToast } = useWorkspaceExperience();
  const { showUpgrade } = useBillingUpgrade();
  const { refreshAll } = useWorkspaceData();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [iconEmoji, setIconEmoji] = useState("");
  const [openCaptureAfter, setOpenCaptureAfter] = useState(true);
  const [template, setTemplate] = useState("blank");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const reset = useCallback(() => {
    setName("");
    setIconEmoji("");
    setOpenCaptureAfter(true);
    setTemplate("blank");
    setError(null);
    setCreating(false);
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const openDialog = useCallback(() => {
    reset();
    window.dispatchEvent(new Event("route5:mobile-sidebar-close"));
    queueMicrotask(() => {
      const el = dialogRef.current;
      if (!el || el.open) return;
      try {
        el.showModal();
      } catch {
        /* showModal unsupported */
      }
    });
  }, [reset]);

  useEffect(() => {
    const onOpen = () => openDialog();
    window.addEventListener("route5:new-project-open", onOpen);
    return () => window.removeEventListener("route5:new-project-open", onOpen);
  }, [openDialog]);

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("modal.newProject.errorNameRequired"));
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          name: trimmed,
          iconEmoji: iconEmoji.trim() ? iconEmoji.trim() : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        project?: Project;
        message?: string;
        upgrade?: UpgradePromptPayload;
      };
      if (!res.ok) {
        if (res.status === 409 && data.error === "plan_limit" && data.upgrade) {
          showUpgrade(data.upgrade);
          setError(data.message ?? t("modal.newProject.projectLimitDefault"));
          return;
        }
        if ((res.status === 403 || res.status === 409) && data.code === "LIMIT_PROJECTS") {
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
      if (!pid) {
        setError(t("modal.newProject.errorCreate"));
        return;
      }
      try {
        localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, pid);
        window.dispatchEvent(new CustomEvent("route5:project-scope-changed", { detail: { projectId: pid } }));
      } catch {
        /* ignore */
      }
      pushToast(`Project "${data.project?.name ?? trimmed}" created`, "success");
      dialogRef.current?.close();
      router.refresh();
      if (openCaptureAfter) {
        router.push(`/projects/${pid}`, { scroll: true });
        window.setTimeout(() => {
          window.dispatchEvent(new Event("route5:capture-open"));
        }, 120);
      } else {
        router.push(`/projects/${pid}`, { scroll: true });
      }
      try {
        localStorage.setItem("route5.newProjectTemplate", template);
      } catch {
        /* ignore */
      }
      void refreshAll();
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : t("modal.newProject.errorCreate");
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  if (!mounted || typeof document === "undefined") return null;

  const dialog = (
    <dialog
      ref={dialogRef}
      className="fixed left-1/2 top-1/2 z-[100020] w-[min(100vw-1.5rem,28rem)] max-h-[min(92vh,40rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl [&::backdrop]:bg-zinc-900/30 [&::backdrop]:backdrop-blur-sm"
      style={{ colorScheme: "light" }}
      onClose={reset}
      onCancel={(ev) => {
        ev.preventDefault();
        close();
      }}
      onClick={(ev) => {
        if (ev.target === dialogRef.current) close();
      }}
    >
      <form onSubmit={(e) => void submit(e)} className="flex max-h-[min(92vh,40rem)] flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100">
              <FolderKanban className="h-4 w-4 text-zinc-700" aria-hidden />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold text-zinc-900">{t("modal.newProject.title")}</h2>
              <p className="mt-0.5 text-[12px] text-zinc-500">
                {t("modal.newProject.stepOf", { step: 1, total: 1 })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100"
            aria-label={t("modal.newProject.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-3 text-[12px] leading-relaxed text-zinc-500">{t("modal.newProject.step1Intro")}</p>
          <label htmlFor="new-project-icon" className="text-[12px] font-medium text-zinc-600">
            {t("modal.newProject.icon")}
          </label>
          <input
            id="new-project-icon"
            name="projectIcon"
            value={iconEmoji}
            onChange={(e) => setIconEmoji(e.target.value.slice(0, 2))}
            placeholder="★"
            aria-label={t("modal.newProject.projectIconAria")}
            autoComplete="off"
            className="mt-2 min-h-11 w-20 rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-center text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
          <label htmlFor="new-project-name" className="text-[12px] font-medium text-zinc-600">
            {t("modal.newProject.projectName")}
          </label>
          <input
            id="new-project-name"
            name="projectName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("modal.newProject.namePlaceholder")}
            autoComplete="off"
            className="mt-2 min-h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            autoFocus
          />
          <div className="mt-4 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-[12px] text-zinc-500">{t("modal.newProject.step2Intro")}</p>
            <label htmlFor="new-project-template" className="text-[12px] font-medium text-zinc-700">
              {t("modal.newProject.templateLabel")}
            </label>
            <select
              id="new-project-template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900"
            >
              <option value="blank">{t("modal.newProject.templateBlank")}</option>
              <option value="standard">Standard</option>
              <option value="execution">Execution</option>
            </select>
            <label className="mt-2 flex items-start gap-2 text-[12px] text-zinc-700">
              <input
                type="checkbox"
                checked={openCaptureAfter}
                onChange={(e) => setOpenCaptureAfter(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900"
              />
              <span>
                <span className="font-medium">{t("modal.newProject.openCaptureAfter")}</span>
                <span className="mt-0.5 block text-zinc-500">{t("modal.newProject.openCaptureAfterHint")}</span>
              </span>
            </label>
          </div>
          {error ? (
            <p className="mt-3 text-[13px] text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-200 px-4 py-3">
          <button
            type="button"
            onClick={close}
            className="inline-flex min-h-11 items-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t("modal.newProject.creating")}
              </>
            ) : (
              t("modal.newProject.create")
            )}
          </button>
        </footer>
      </form>
    </dialog>
  );

  return createPortal(dialog, document.body);
}
