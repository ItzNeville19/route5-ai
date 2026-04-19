"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FolderKanban, Loader2, X } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useBillingUpgrade } from "@/components/billing/BillingUpgradeProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import type { Project } from "@/lib/types";
import type { UpgradePromptPayload } from "@/lib/billing/types";

type OrgMemberOption = {
  userId: string;
  /** From API when present — preferred over client-side inference. */
  displayName?: string;
  profile: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    imageUrl: string | null;
    primaryEmail: string | null;
  };
};

function displayNameForMember(m: OrgMemberOption): string {
  if (m.displayName?.trim()) return m.displayName.trim();
  const fn = m.profile.firstName?.trim();
  const ln = m.profile.lastName?.trim();
  const combined = [fn, ln].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  const un = m.profile.username?.trim();
  if (un) return un;
  const em = m.profile.primaryEmail?.trim();
  if (em) {
    const local = em.split("@")[0]?.trim();
    if (local) return local;
  }
  return "Teammate";
}

const ICON_MARKERS = [
  "🚀",
  "📈",
  "⚙️",
  "🎯",
  "🧩",
  "📝",
  "💎",
  "🧠",
  "🌌",
  "🏁",
  "📦",
  "💼",
  "🏎️",
  "🛰️",
  "🔮",
  "🛡️",
  "🗂️",
  "🧪",
  "🎬",
  "📊",
  "💡",
  "🔧",
  "🌟",
] as const;

const ACTIVE_PROJECT_STORAGE_KEY = "route5.headerProjectId";

export default function NewProjectModal() {
  const { t } = useI18n();
  const router = useRouter();
  const { pushToast } = useWorkspaceExperience();
  const { showUpgrade } = useBillingUpgrade();
  const { refreshAll } = useWorkspaceData();

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconMarker, setIconMarker] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrgMemberOption[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const reset = useCallback(() => {
    setName("");
    setDescription("");
    setIconMarker("");
    setSelectedMemberIds([]);
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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetch("/api/workspace/organization", { credentials: "same-origin" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          members?: Array<
            OrgMemberOption & { displayName?: string; profile?: OrgMemberOption["profile"] }
          >;
        };
        if (!res.ok || cancelled) return;
        const raw = data.members ?? [];
        setOrgMembers(
          raw.map((row) => {
            const profile = {
              firstName: row.profile?.firstName ?? null,
              lastName: row.profile?.lastName ?? null,
              username: row.profile?.username ?? null,
              imageUrl: row.profile?.imageUrl ?? null,
              primaryEmail: row.profile?.primaryEmail ?? null,
            };
            const opt: OrgMemberOption = {
              userId: String(row.userId ?? ""),
              displayName: typeof row.displayName === "string" ? row.displayName : undefined,
              profile,
            };
            return { ...opt, displayName: opt.displayName ?? displayNameForMember(opt) };
          })
        );
      })
      .catch(() => {
        if (!cancelled) setOrgMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

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
          ...(selectedMemberIds.length > 0 ? { memberUserIds: selectedMemberIds } : {}),
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
      if (pid) {
        try {
          localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, pid);
          window.dispatchEvent(new CustomEvent("route5:project-scope-changed", { detail: { projectId: pid } }));
        } catch {
          /* ignore */
        }
        pushToast(`Project "${trimmed}" created`, "success");
        await refreshAll();
        close();
        router.push(`/projects/${pid}`, { scroll: true });
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
            className="absolute inset-0 bg-zinc-900/25 backdrop-blur-xl"
            aria-label={t("modal.newProject.close")}
            onClick={close}
          />
          <div
            className="relative z-[1] isolate flex max-h-[min(92vh,680px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.25rem] border !border-zinc-200 shadow-[0_25px_80px_-20px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:rounded-3xl"
            style={{
              backgroundColor: "rgba(255,255,255,0.98)",
              color: "#18181b",
              colorScheme: "light",
            }}
          >
            <header className="relative flex shrink-0 items-center justify-between border-b !border-zinc-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100">
                  <FolderKanban className="h-4 w-4 text-zinc-700" aria-hidden />
                </span>
                <div>
                  <h2 id="new-project-modal-title" className="text-[17px] font-semibold !text-zinc-900">
                    {t("modal.newProject.title")}
                  </h2>
                  <p className="mt-0.5 text-[12px] !text-zinc-500">
                    Create a project and sync it across every signed-in device.
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
            <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4 sm:px-5">
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Preview
                  </p>
                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-[20px]">
                      {iconMarker || "◆"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-zinc-900">
                        {name.trim() || t("modal.newProject.untitled")}
                      </p>
                      <p className="truncate text-[12px] text-zinc-500">
                        {description.trim() || "Project will appear in your switcher immediately."}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="new-project-name" className="text-[12px] font-medium text-zinc-600">
                    {t("modal.newProject.projectName")}
                  </label>
                  <input
                    id="new-project-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("modal.newProject.namePlaceholder")}
                    className="mt-2 min-h-11 w-full rounded-2xl border !border-zinc-200 !bg-white px-4 py-3 text-[15px] !text-zinc-900 placeholder:!text-zinc-400 focus:!border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="new-project-description" className="text-[12px] font-medium text-zinc-600">
                    Description
                  </label>
                  <textarea
                    id="new-project-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 240))}
                    rows={3}
                    placeholder="What this project is responsible for"
                    className="mt-2 w-full resize-none rounded-2xl border !border-zinc-200 !bg-white px-4 py-3 text-[14px] !text-zinc-900 placeholder:!text-zinc-400 focus:!border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-zinc-600">Team members</label>
                  <div className="mt-2 max-h-[180px] space-y-1 overflow-y-auto rounded-2xl border !border-zinc-200 !bg-zinc-50 p-2">
                    {orgMembers.length === 0 ? (
                      <p className="px-2 py-2 text-[12px] text-zinc-500">
                        Add organization members first to assign collaborators.
                      </p>
                    ) : (
                      orgMembers.map((member) => {
                        const checked = selectedMemberIds.includes(member.userId);
                        const label =
                          member.displayName?.trim() || displayNameForMember(member);
                        const subtitle = member.profile.primaryEmail?.trim() || null;
                        return (
                          <label
                            key={member.userId}
                            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-[13px] !text-zinc-900 hover:!bg-white"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                setSelectedMemberIds((prev) =>
                                  event.target.checked
                                    ? [...new Set([...prev, member.userId])]
                                    : prev.filter((id) => id !== member.userId)
                                )
                              }
                              className="h-4 w-4 shrink-0 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900/20"
                            />
                            {member.profile.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={member.profile.imageUrl}
                                alt=""
                                className="h-8 w-8 shrink-0 rounded-full border border-zinc-200 object-cover"
                              />
                            ) : (
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-[11px] font-semibold text-zinc-600">
                                {label
                                  .split(/\s+/)
                                  .map((w) => w[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase() || "?"}
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{label}</span>
                              {subtitle ? (
                                <span className="block truncate text-[11px] text-zinc-500">{subtitle}</span>
                              ) : null}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-medium text-zinc-600">
                    {t("modal.newProject.icon")}
                  </label>
                  <div className="mt-2 flex flex-wrap items-start gap-2">
                    <input
                      type="text"
                      value={iconMarker}
                      onChange={(e) => setIconMarker([...e.target.value].slice(0, 1).join(""))}
                      className="flex h-11 w-11 rounded-xl border border-zinc-200 bg-white text-center text-[18px] text-zinc-900"
                      maxLength={8}
                      aria-label={t("modal.newProject.projectIconAria")}
                      placeholder="—"
                    />
                    <div className="grid max-h-[126px] flex-1 grid-cols-8 gap-1.5 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/90 p-1.5">
                      {ICON_MARKERS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setIconMarker(m)}
                          className={`flex h-8 w-8 items-center justify-center rounded-md border text-[15px] transition ${
                            iconMarker === m
                              ? "border-zinc-900 bg-zinc-900/5 text-zinc-900"
                              : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {error ? (
                  <p className="text-[13px] text-red-700" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>

            <footer className="flex shrink-0 items-center justify-end gap-2 border-t !border-zinc-200 !bg-white px-4 py-3">
              <button
                type="button"
                onClick={close}
                className="inline-flex min-h-11 items-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[14px] font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating || !name.trim()}
                onClick={() => void createProject()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm disabled:opacity-40"
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
          </div>
        </div>
      ) : null}
    </>,
    document.body
  );
}
