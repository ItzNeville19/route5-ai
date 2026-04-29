"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, FolderKanban, Plus } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { canCreateCompany } from "@/lib/workspace-role";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";

const STORAGE_KEY = "route5.headerProjectId";

type SwitcherMode = "default" | "headerScope";

function readStoredId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

function writeStoredId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent("route5:project-scope-changed", { detail: { projectId: id } }));
  } catch {
    /* ignore */
  }
}

export default function WorkspaceProjectSwitcher({ mode = "default" as SwitcherMode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { setPrefs, workspacePaletteLight } = useWorkspaceExperience();
  const { projects, loadingProjects, refreshProjects, orgRole, loadingOrganization } = useWorkspaceData();
  const headerScope = mode === "headerScope";
  const canAddCompany = !loadingOrganization && canCreateCompany(orgRole);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showColdSkeleton, setShowColdSkeleton] = useState(false);
  const [lastStableProject, setLastStableProject] = useState<(typeof projects)[number] | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  const pathProjectId = pathname.match(/^\/(?:projects|companies)\/([^/]+)/)?.[1] ?? null;
  const deskProjectId = pathname.startsWith("/desk") ? searchParams.get("projectId") : null;

  const current = useMemo(() => {
    if (!selectedId) return undefined;
    return projects.find((p) => p.id === selectedId);
  }, [projects, selectedId]);

  const stableCurrent = current ?? lastStableProject ?? undefined;

  useEffect(() => {
    if (current) {
      setLastStableProject(current);
    }
  }, [current, setLastStableProject]);

  useEffect(() => {
    const explicit = pathProjectId ?? deskProjectId;
    if (explicit && projects.some((p) => p.id === explicit)) {
      setSelectedId(explicit);
      return;
    }
    if (selectedId && projects.some((p) => p.id === selectedId)) return;
    const stored = readStoredId();
    if (stored && projects.some((p) => p.id === stored)) {
      setSelectedId(stored);
      return;
    }
    setSelectedId(projects[0]?.id ?? null);
  }, [pathProjectId, deskProjectId, projects, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    if (readStoredId() === selectedId) return;
    writeStoredId(selectedId);
  }, [selectedId]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const vw = typeof window !== "undefined" ? window.innerWidth : 400;
    const maxW = Math.min(vw - 32, 320);
    setMenuPos({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, vw - maxW - 8)),
      width: Math.min(maxW, Math.max(260, rect.width)),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updateMenuPosition();
  }, [open, projects.length, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!loadingProjects || projects.length > 0) {
      setShowColdSkeleton(false);
      return;
    }
    const t = window.setTimeout(() => setShowColdSkeleton(true), 200);
    return () => window.clearTimeout(t);
  }, [loadingProjects, projects.length]);

  const selectProject = useCallback(
    (id: string) => {
      setSelectedId(id);
      writeStoredId(id);
      setOpen(false);
      if (headerScope) {
        setPrefs({ headerScopedProjectId: id });
        return;
      }
      router.push(`/companies/${id}`);
    },
    [headerScope, router, setPrefs]
  );

  const openNew = useCallback(() => {
    setOpen(false);
    window.dispatchEvent(
      new CustomEvent("route5:new-project-open", { detail: { mode: "company" } })
    );
  }, []);

  if (loadingProjects && projects.length === 0 && !stableCurrent && showColdSkeleton) {
    return (
      <div
        className="min-h-8 max-w-[min(52vw,220px)] shrink-0 animate-pulse rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary/60 px-3 sm:max-w-[240px]"
        aria-hidden
      />
    );
  }

  if (projects.length === 0) {
    if (headerScope) return null;
    if (canAddCompany) {
      return (
        <button
          type="button"
          onClick={openNew}
          className="inline-flex min-h-8 max-w-[min(52vw,220px)] shrink-0 items-center gap-1.5 rounded-[var(--r5-radius-pill)] border border-dashed border-r5-border-subtle bg-r5-surface-secondary/80 px-2.5 text-[12px] font-medium text-r5-text-secondary transition hover:border-r5-text-tertiary hover:text-r5-text-primary sm:max-w-[240px]"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="truncate">{t("header.companies.emptyAdd")}</span>
        </button>
      );
    }
    return (
      <div
        className="inline-flex min-h-8 max-w-[min(60vw,280px)] shrink-0 flex-col justify-center gap-0.5 rounded-[var(--r5-radius-pill)] border border-dashed border-r5-border-subtle/80 bg-r5-surface-secondary/50 px-2.5 py-1.5 text-left sm:max-w-[300px]"
        title={t("header.companies.emptyMemberHint")}
      >
        <span className="truncate text-[11px] font-semibold text-r5-text-primary">{t("header.companies.emptyMember")}</span>
        <span className="line-clamp-2 text-[10px] leading-snug text-r5-text-tertiary">{t("header.companies.emptyMemberHint")}</span>
      </div>
    );
  }

  const label = stableCurrent?.name ?? "Company";
  const iconEmoji = stableCurrent?.iconEmoji?.trim();

  const headerTriggerClass = headerScope
    ? workspacePaletteLight
      ? "inline-flex w-full min-h-8 min-w-0 max-w-full items-center gap-1 rounded-md border-0 bg-transparent px-1 py-1 text-left text-[12px] font-semibold text-slate-900 transition hover:bg-slate-900/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
      : "inline-flex w-full min-h-8 min-w-0 max-w-full items-center gap-1 rounded-md border-0 bg-transparent px-1 py-1 text-left text-[12px] font-semibold text-white/95 transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/35"
    : "";

  const headerMenuClass =
    headerScope && workspacePaletteLight
      ? "overflow-hidden rounded-lg border border-slate-200/80 bg-white py-1 shadow-lg shadow-slate-900/12"
      : headerScope
        ? "overflow-hidden rounded-lg border border-white/[0.1] bg-[#0c1416] py-1 shadow-xl shadow-black/50"
        : "overflow-hidden rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-primary/98 py-1 shadow-[var(--r5-shadow-elevated)] backdrop-blur-md";

  const headerMenuHeading =
    headerScope && workspacePaletteLight
      ? "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
      : headerScope
        ? "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45"
        : "px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-r5-text-tertiary";

  const headerMenuItem = (active: boolean) =>
    headerScope && workspacePaletteLight
      ? `flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition hover:bg-slate-100 ${
          active ? "bg-slate-100 text-slate-900" : "text-slate-800"
        }`
      : headerScope
        ? `flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition hover:bg-white/[0.06] ${
            active ? "bg-white/[0.07] text-white" : "text-white/85"
          }`
        : `flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition hover:bg-r5-surface-hover ${
            active ? "bg-r5-surface-secondary/80 text-r5-text-primary" : "text-r5-text-secondary"
          }`;

  const dropdown =
    open && portalReady && menuPos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              zIndex: 10000,
            }}
            className={headerMenuClass}
          >
            <p className={headerMenuHeading}>
              {headerScope ? t("workspace.chrome.activeCompany") : "Companies"}
            </p>
            <div className="max-h-[min(60vh,280px)] overflow-y-auto">
              {projects.map((p) => {
                const active = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => selectProject(p.id)}
                    className={headerMenuItem(active)}
                    title={p.name}
                  >
                    <span className="w-5 shrink-0 text-center text-[14px]">{p.iconEmoji?.trim() || "◆"}</span>
                    <span className="min-w-0 flex-1 whitespace-normal break-words leading-tight">
                      {p.name}
                    </span>
                    {active ? (
                      <Check
                        className={`h-4 w-4 shrink-0 ${
                          headerScope && workspacePaletteLight
                            ? "text-sky-600"
                            : headerScope
                              ? "text-cyan-400"
                              : "text-r5-accent"
                        }`}
                        strokeWidth={2}
                        aria-hidden
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div
              className={
                headerScope && workspacePaletteLight
                  ? "border-t border-slate-200/90 p-1"
                  : headerScope
                    ? "border-t border-white/[0.08] p-1"
                    : "border-t border-r5-border-subtle p-1"
              }
            >
              {canAddCompany && !headerScope ? (
                <button
                  type="button"
                  onClick={openNew}
                  className="flex w-full items-center gap-2 rounded-[var(--r5-radius-md)] px-3 py-2 text-left text-[13px] font-medium text-r5-text-primary transition hover:bg-r5-surface-hover"
                >
                  <Plus className="h-4 w-4 shrink-0 text-r5-accent" strokeWidth={2} aria-hidden />
                  {t("header.companies.addNew")}
                </button>
              ) : null}
              {canAddCompany && headerScope ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openNew();
                  }}
                  className={
                    workspacePaletteLight
                      ? "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-800 transition hover:bg-slate-100/90"
                      : "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-white/90 transition hover:bg-white/[0.06]"
                  }
                >
                  <Plus
                    className={`h-4 w-4 shrink-0 ${workspacePaletteLight ? "text-sky-600" : "text-cyan-400"}`}
                    strokeWidth={2}
                    aria-hidden
                  />
                  {t("header.companies.addNew")}
                </button>
              ) : null}
              <Link
                href="/companies"
                onClick={() => setOpen(false)}
                className={
                  headerScope && workspacePaletteLight
                    ? "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-slate-600 transition hover:bg-slate-100/80 hover:text-slate-900"
                    : headerScope
                      ? "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                      : "flex w-full items-center gap-2 rounded-[var(--r5-radius-md)] px-3 py-2 text-left text-[13px] text-r5-text-secondary transition hover:bg-r5-surface-hover hover:text-r5-text-primary"
                }
              >
                {t("workspace.chrome.allCompanies")}
              </Link>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      className={
        headerScope
          ? "relative z-[200] w-full min-w-0 max-w-[15rem] shrink-0 sm:max-w-[17rem]"
          : "relative z-[200] min-w-0 max-w-[min(70vw,340px)] shrink-0 sm:max-w-[360px]"
      }
    >
      <button
        ref={anchorRef}
        type="button"
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next && projects.length === 0) {
              void refreshProjects();
            }
            return next;
          });
        }}
        className={
          headerScope
            ? headerTriggerClass
            : "flex max-w-[min(100%,340px)] min-h-8 items-center gap-1.5 rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary/90 px-2.5 py-1 text-left text-[12px] font-[var(--r5-font-weight-medium)] text-r5-text-primary shadow-[var(--r5-shadow-elevated)] transition hover:bg-r5-surface-hover"
        }
        aria-expanded={open}
        aria-haspopup="listbox"
        title={label}
      >
        {iconEmoji ? (
          <span className="shrink-0 text-[13px] leading-none" aria-hidden>
            {iconEmoji}
          </span>
        ) : headerScope ? null : (
          <FolderKanban
            className="h-3.5 w-3.5 shrink-0 text-r5-text-secondary"
            strokeWidth={2}
            aria-hidden
          />
        )}
        <span
          className={
            headerScope
              ? "min-w-0 flex-1 truncate text-left"
              : "min-w-0 flex-1 whitespace-normal break-words leading-tight"
          }
        >
          {label}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition ${open ? "rotate-180" : ""} ${
            headerScope
              ? workspacePaletteLight
                ? "text-slate-500"
                : "text-cyan-200/50"
              : "text-r5-text-tertiary"
          }`}
          aria-hidden
        />
      </button>

      {dropdown}
    </div>
  );
}
