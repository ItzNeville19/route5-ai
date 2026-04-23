"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, FolderKanban, Plus } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { canCreateCompany } from "@/lib/workspace-role";

const STORAGE_KEY = "route5.headerProjectId";

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

export default function WorkspaceProjectSwitcher() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { projects, loadingProjects, refreshProjects, orgRole, loadingOrganization } = useWorkspaceData();
  const canAddCompany = !loadingOrganization && canCreateCompany(orgRole);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showColdSkeleton, setShowColdSkeleton] = useState(false);
  const [lastStableProject, setLastStableProject] = useState<(typeof projects)[number] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

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
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
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
      router.push(`/companies/${id}`);
    },
    [router]
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

  return (
    <div
      ref={rootRef}
      className="relative z-[200] min-w-0 max-w-[min(70vw,340px)] shrink-0 sm:max-w-[360px]"
    >
      <button
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
        className="flex max-w-[min(100%,340px)] min-h-8 items-center gap-1.5 rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-secondary/90 px-2.5 py-1 text-left text-[12px] font-[var(--r5-font-weight-medium)] text-r5-text-primary shadow-[var(--r5-shadow-elevated)] transition hover:bg-r5-surface-hover"
        aria-expanded={open}
        aria-haspopup="listbox"
        title={label}
      >
        {iconEmoji ? (
          <span className="shrink-0 text-[14px] leading-none" aria-hidden>
            {iconEmoji}
          </span>
        ) : (
          <FolderKanban className="h-3.5 w-3.5 shrink-0 text-r5-text-secondary" strokeWidth={2} aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-r5-text-tertiary transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-[300] min-w-[260px] max-w-[min(100vw-2rem,320px)] overflow-hidden rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-primary/98 py-1 shadow-[var(--r5-shadow-elevated)] backdrop-blur-md"
        >
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-r5-text-tertiary">
            Companies
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
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition hover:bg-r5-surface-hover ${
                    active ? "bg-r5-surface-secondary/80 text-r5-text-primary" : "text-r5-text-secondary"
                  }`}
                  title={p.name}
                >
                  <span className="w-5 shrink-0 text-center text-[14px]">{p.iconEmoji?.trim() || "◆"}</span>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {active ? <Check className="h-4 w-4 shrink-0 text-r5-accent" strokeWidth={2} aria-hidden /> : null}
                </button>
              );
            })}
          </div>
          <div className="border-t border-r5-border-subtle p-1">
            {canAddCompany ? (
              <button
                type="button"
                onClick={openNew}
                className="flex w-full items-center gap-2 rounded-[var(--r5-radius-md)] px-3 py-2 text-left text-[13px] font-medium text-r5-text-primary transition hover:bg-r5-surface-hover"
              >
                <Plus className="h-4 w-4 shrink-0 text-r5-accent" strokeWidth={2} aria-hidden />
                {t("header.companies.addNew")}
              </button>
            ) : null}
            <Link
              href="/companies"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-[var(--r5-radius-md)] px-3 py-2 text-left text-[13px] text-r5-text-secondary transition hover:bg-r5-surface-hover hover:text-r5-text-primary"
            >
              All companies
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
