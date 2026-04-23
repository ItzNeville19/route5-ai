"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { CheckSquare, FolderKanban, Loader2, X } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useBillingUpgrade } from "@/components/billing/BillingUpgradeProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import type { Project } from "@/lib/types";
import type { UpgradePromptPayload } from "@/lib/billing/types";

const ACTIVE_PROJECT_STORAGE_KEY = "route5.headerProjectId";

export type CreateModalMode = "task" | "company";

function defaultDeadlineLocalValue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(17, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Create flow as a native `<dialog>` (top layer) — task (org commitment) or company (project).
 */
export default function NewProjectModal() {
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useUser();
  const { pushToast } = useWorkspaceExperience();
  const { showUpgrade } = useBillingUpgrade();
  const { refreshAll, projects, orgRole } = useWorkspaceData();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<CreateModalMode>("task");

  // Company
  const [name, setName] = useState("");
  const [iconEmoji, setIconEmoji] = useState("");
  const [openCaptureAfter, setOpenCaptureAfter] = useState(true);
  const [template, setTemplate] = useState("blank");

  // Task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDeadline, setTaskDeadline] = useState(defaultDeadlineLocalValue);
  const [taskPriority, setTaskPriority] = useState<"critical" | "high" | "medium" | "low">("medium");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskOwnerId, setTaskOwnerId] = useState("");
  const [orgMembers, setOrgMembers] = useState<{ userId: string; displayName: string }[]>([]);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (orgRole !== "admin") {
      if (user?.id) setTaskOwnerId(user.id);
      return;
    }
    let cancel = false;
    void (async () => {
      const res = await fetch("/api/workspace/organization", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        members?: { userId: string; displayName: string }[];
      };
      if (!cancel && res.ok && data.members) {
        setOrgMembers(
          data.members.map((m) => ({ userId: m.userId, displayName: m.displayName }))
        );
      }
    })();
    return () => {
      cancel = true;
    };
  }, [orgRole, user?.id]);

  const openModal = useCallback(
    (next: CreateModalMode) => {
      setMode(next);
      setName("");
      setIconEmoji("");
      setOpenCaptureAfter(true);
      setTemplate("blank");
      setTaskTitle("");
      setTaskDescription("");
      setTaskDeadline(defaultDeadlineLocalValue());
      setTaskPriority("medium");
      setTaskProjectId("");
      setError(null);
      if (user?.id) setTaskOwnerId(user.id);
      setCreating(false);
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
    },
    [user?.id]
  );

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ mode?: CreateModalMode }>).detail;
      const next: CreateModalMode = d?.mode === "company" ? "company" : "task";
      openModal(next);
    };
    window.addEventListener("route5:new-project-open", onOpen);
    return () => window.removeEventListener("route5:new-project-open", onOpen);
  }, [openModal]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHash = () => {
      if (window.location.hash === "#new-project") {
        openModal("company");
      }
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [openModal]);

  const resetOnClose = useCallback(() => {
    setName("");
    setIconEmoji("");
    setTaskTitle("");
    setTaskDescription("");
    setTaskDeadline(defaultDeadlineLocalValue());
    setError(null);
    setCreating(false);
  }, []);

  async function submitTask(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = taskTitle.trim();
    if (!trimmed) {
      setError(t("modal.createTask.errorTitle"));
      return;
    }
    const oid = taskOwnerId.trim() || user?.id;
    if (!oid) {
      setError(t("modal.createTask.errorOwner"));
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const deadline = new Date(taskDeadline);
      if (Number.isNaN(deadline.getTime())) {
        setError(t("modal.createTask.errorDeadline"));
        setCreating(false);
        return;
      }
      if (deadline.getTime() < Date.now() - 60_000) {
        setError(t("modal.createTask.errorPast"));
        setCreating(false);
        return;
      }
      const body: Record<string, unknown> = {
        title: trimmed,
        description: taskDescription.trim() || null,
        ownerId: oid,
        deadline: deadline.toISOString(),
        priority: taskPriority,
      };
      if (taskProjectId) body.projectId = taskProjectId;

      const res = await fetch("/api/commitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        commitment?: { id: string };
        upgrade?: UpgradePromptPayload;
      };
      if (!res.ok) {
        if (res.status === 409 && data.error === "plan_limit" && data.upgrade) {
          showUpgrade(data.upgrade);
          return;
        }
        setError(data.error ?? t("modal.createTask.errorCreate"));
        return;
      }
      const id = data.commitment?.id;
      pushToast(t("modal.createTask.toast"), "success");
      dialogRef.current?.close();
      void refreshAll();
      if (id) {
        router.push(`/workspace/commitments?id=${encodeURIComponent(id)}`, { scroll: true });
      } else {
        router.push("/workspace/commitments", { scroll: true });
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message ? err.message : t("modal.createTask.errorCreate");
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  async function submitCompany(e: React.FormEvent) {
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
        window.dispatchEvent(
          new CustomEvent("route5:project-scope-changed", { detail: { projectId: pid } })
        );
      } catch {
        /* ignore */
      }
      pushToast(`Company "${data.project?.name ?? trimmed}" created`, "success");
      dialogRef.current?.close();
      router.refresh();
      if (openCaptureAfter) {
        router.push(`/companies/${pid}`, { scroll: true });
        window.setTimeout(() => {
          window.dispatchEvent(new Event("route5:capture-open"));
        }, 120);
      } else {
        router.push(`/companies/${pid}`, { scroll: true });
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
      aria-labelledby="new-create-modal-title"
      className="fixed left-1/2 top-1/2 z-[100020] w-[min(100vw-1.5rem,32rem)] max-h-[min(92vh,44rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl [&::backdrop]:bg-zinc-900/30 [&::backdrop]:backdrop-blur-sm"
      style={{ colorScheme: "light" }}
      onClose={resetOnClose}
      onCancel={(ev) => {
        ev.preventDefault();
        close();
      }}
      onClick={(ev) => {
        if (ev.target === dialogRef.current) close();
      }}
    >
      <form
        onSubmit={mode === "task" ? (e) => void submitTask(e) : (e) => void submitCompany(e)}
        className="flex max-h-[min(92vh,44rem)] flex-col"
      >
        <header className="relative shrink-0 border-b border-zinc-200 px-4 pb-3 pt-3">
          <button
            type="button"
            onClick={close}
            className="absolute right-2 top-2 rounded-full p-2 text-zinc-500 hover:bg-zinc-100"
            aria-label={t("modal.newProject.close")}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="mb-2 mr-8 flex w-full gap-1 rounded-2xl bg-zinc-100/90 p-1">
            <button
              type="button"
              onClick={() => setMode("task")}
              className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-2.5 text-[14px] font-medium transition ${
                mode === "task"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" aria-hidden />
              {t("modal.createTask.tabTask")}
            </button>
            <button
              type="button"
              onClick={() => setMode("company")}
              className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-2.5 text-[14px] font-medium transition ${
                mode === "company"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <FolderKanban className="h-3.5 w-3.5" aria-hidden />
              {t("modal.createTask.tabCompany")}
            </button>
          </div>
          <h2
            className="mt-2.5 pl-0.5 text-[17px] font-semibold text-zinc-900"
            id="new-create-modal-title"
          >
            {mode === "task" ? t("modal.createTask.title") : t("modal.newProject.title")}
          </h2>
          <p className="mt-0.5 pl-0.5 text-[12px] text-zinc-500">
            {mode === "task" ? t("modal.createTask.subtitle") : t("modal.createTask.companyHint")}
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {mode === "task" ? (
            <div className="space-y-3">
              <p className="text-[12px] leading-relaxed text-zinc-500">{t("modal.createTask.intro")}</p>
              <div>
                <label htmlFor="new-task-title" className="text-[12px] font-medium text-zinc-600">
                  {t("modal.createTask.fieldTitle")}
                </label>
                <input
                  id="new-task-title"
                  name="title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder={t("modal.createTask.titlePlaceholder")}
                  className="mt-2 min-h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="new-task-body" className="text-[12px] font-medium text-zinc-600">
                  {t("modal.createTask.fieldDescription")}
                </label>
                <textarea
                  id="new-task-body"
                  name="description"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder={t("modal.createTask.descriptionPlaceholder")}
                  rows={3}
                  className="mt-2 min-h-[4.5rem] w-full resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="new-task-due" className="text-[12px] font-medium text-zinc-600">
                    {t("modal.createTask.fieldDue")}
                  </label>
                  <input
                    id="new-task-due"
                    type="datetime-local"
                    name="due"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="mt-2 min-h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-[14px] text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>
                <div>
                  <label htmlFor="new-task-priority" className="text-[12px] font-medium text-zinc-600">
                    {t("modal.createTask.fieldPriority")}
                  </label>
                  <select
                    id="new-task-priority"
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as typeof taskPriority)}
                    className="mt-2 min-h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-[14px] text-zinc-900"
                  >
                    <option value="low">{t("modal.createTask.priorityLow")}</option>
                    <option value="medium">{t("modal.createTask.priorityMed")}</option>
                    <option value="high">{t("modal.createTask.priorityHigh")}</option>
                    <option value="critical">{t("modal.createTask.priorityCritical")}</option>
                  </select>
                </div>
              </div>
              {projects.length > 0 ? (
                <div>
                  <label htmlFor="new-task-company" className="text-[12px] font-medium text-zinc-600">
                    {t("modal.createTask.fieldCompany")}
                  </label>
                  <select
                    id="new-task-company"
                    value={taskProjectId}
                    onChange={(e) => setTaskProjectId(e.target.value)}
                    className="mt-2 min-h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-[14px] text-zinc-900"
                  >
                    <option value="">{t("modal.createTask.companyNone")}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {orgRole === "admin" && orgMembers.length > 0 ? (
                <div>
                  <label htmlFor="new-task-owner" className="text-[12px] font-medium text-zinc-600">
                    {t("modal.createTask.fieldOwner")}
                  </label>
                  <select
                    id="new-task-owner"
                    value={taskOwnerId}
                    onChange={(e) => setTaskOwnerId(e.target.value)}
                    className="mt-2 min-h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-[14px] text-zinc-900"
                  >
                    {orgMembers.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[12px] leading-relaxed text-zinc-500">{t("modal.newProject.step1Intro")}</p>
              <div>
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
                  className="mt-2 min-h-11 w-20 rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-center text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div>
                <label htmlFor="new-project-name" className="text-[12px] font-medium text-zinc-600">
                  {t("modal.newProject.projectName")}
                </label>
                <input
                  id="new-project-name"
                  name="projectName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("modal.newProject.namePlaceholder")}
                  className="mt-2 min-h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
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
            </div>
          )}

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
            {t("modal.createTask.cancel")}
          </button>
          <button
            type="submit"
            disabled={creating}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {mode === "task" ? t("modal.createTask.creating") : t("modal.newProject.creating")}
              </>
            ) : mode === "task" ? (
              t("modal.createTask.submit")
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
