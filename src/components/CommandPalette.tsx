"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Search } from "lucide-react";
import { paletteOverlay, palettePanel } from "@/lib/motion";
import {
  buildPaletteItems,
  type PaletteItem,
  type PaletteRecentRun,
  type PaletteSection,
} from "@/lib/command-palette-items";

type PaletteContextValue = {
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function useCommandPalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  }
  return ctx;
}

const SECTION_LABEL: Record<PaletteSection, string> = {
  agent: "Workspace",
  activity: "Recent",
  projects: "Projects",
  workspace: "Workspace",
  site: "Website",
  account: "Account",
  legal: "Legal",
};

function groupFiltered(items: PaletteItem[]) {
  const order: PaletteSection[] = [
    "agent",
    "activity",
    "workspace",
    "projects",
    "site",
    "account",
    "legal",
  ];
  const map = new Map<PaletteSection, PaletteItem[]>();
  for (const item of items) {
    const list = map.get(item.section) ?? [];
    list.push(item);
    map.set(item.section, list);
  }
  return order
    .map((section) => ({
      section,
      label: SECTION_LABEL[section],
      items: map.get(section) ?? [],
    }))
    .filter((g) => g.items.length > 0);
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [recentRuns, setRecentRuns] = useState<PaletteRecentRun[]>([]);
  const [openActionsCount, setOpenActionsCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const loadPalette = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/palette", {
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        signedIn?: boolean;
        displayName?: string | null;
        projects?: { id: string; name: string }[];
        recentRuns?: PaletteRecentRun[];
        openActionsCount?: number;
        workspaceDbOk?: boolean;
      };
      setSignedIn(Boolean(data.signedIn));
      setDisplayName(data.displayName ?? null);
      setProjects(Array.isArray(data.projects) ? data.projects : []);
      setRecentRuns(Array.isArray(data.recentRuns) ? data.recentRuns : []);
      setOpenActionsCount(
        typeof data.openActionsCount === "number" && data.openActionsCount >= 0
          ? data.openActionsCount
          : 0
      );
    } catch {
      setSignedIn(false);
      setDisplayName(null);
      setProjects([]);
      setRecentRuns([]);
      setOpenActionsCount(0);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadPalette();
  }, [open, loadPalette]);

  useEffect(() => {
    const onRefresh = () => {
      if (open) void loadPalette();
    };
    window.addEventListener("route5:project-updated", onRefresh);
    return () => window.removeEventListener("route5:project-updated", onRefresh);
  }, [open, loadPalette]);

  const directory = useMemo(
    () =>
      buildPaletteItems({
        signedIn,
        displayName,
        projects,
        recentRuns,
        openActionsCount,
      }),
    [signedIn, displayName, projects, recentRuns, openActionsCount]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return directory;
    return directory.filter((item) => {
      const blob = [
        item.label,
        item.description,
        ...(item.keywords ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [query, directory]);

  const grouped = useMemo(() => groupFiltered(filtered), [filtered]);

  const flatForNav = useMemo(
    () => grouped.flatMap((g) => g.items),
    [grouped]
  );

  const indexById = useMemo(() => {
    const m = new Map<string, number>();
    flatForNav.forEach((item, i) => m.set(item.id, i));
    return m;
  }, [flatForNav]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, open, flatForNav.length]);

  useEffect(() => {
    if (selectedIndex < 0 || selectedIndex >= flatForNav.length) {
      setSelectedIndex(0);
    }
  }, [flatForNav.length, selectedIndex]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const openPalette = useCallback(() => setOpen(true), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      const tag = document.activeElement?.tagName;
      const editable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (document.activeElement as HTMLElement | null)?.isContentEditable;
      if (e.metaKey && e.code === "Space" && !editable) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const onPick = useCallback(
    (href: string) => {
      close();
      const hashIdx = href.indexOf("#");
      if (hashIdx !== -1) {
        const path = href.slice(0, hashIdx);
        const hash = href.slice(hashIdx + 1);
        router.push(`${path}#${hash}`);
        if (path === "/overview") {
          window.setTimeout(() => {
            document.getElementById("new-project-name")?.focus();
          }, 0);
        }
      } else {
        router.push(href);
      }
    },
    [close, router]
  );

  useEffect(() => {
    if (!open) return;
    const onNav = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) =>
          flatForNav.length === 0 ? 0 : (i + 1) % flatForNav.length
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) =>
          flatForNav.length === 0
            ? 0
            : (i - 1 + flatForNav.length) % flatForNav.length
        );
        return;
      }
      if (e.key === "Enter" && flatForNav.length > 0) {
        const item = flatForNav[selectedIndex];
        if (item) {
          e.preventDefault();
          onPick(item.href);
        }
      }
    };
    window.addEventListener("keydown", onNav);
    return () => window.removeEventListener("keydown", onNav);
  }, [open, flatForNav, selectedIndex, onPick]);

  const value = useMemo(
    () => ({ open: openPalette, close, toggle }),
    [openPalette, close, toggle]
  );

  const titleId = useId();

  const inAppShell =
    !!pathname &&
    (pathname.startsWith("/projects") ||
      pathname === "/overview" ||
      pathname === "/desk" ||
      pathname === "/settings" ||
      pathname.startsWith("/integrations") ||
      pathname.startsWith("/docs") ||
      pathname === "/support" ||
      pathname.startsWith("/account"));
  const agentShell = signedIn && inAppShell;

  const placeholder = agentShell
    ? `Search workspace${displayName ? ` (${displayName})` : ""} — Desk, Overview, settings…`
    : "Search Route5 — pages, workspace, legal…";

  const overlay = (
    <AnimatePresence mode="wait">
      {open ? (
        <div
          key="palette-root"
          className="fixed inset-0 z-[99990] flex flex-col items-center px-4 pt-[min(12vh,120px)] sm:pt-[16vh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <motion.button
            type="button"
            variants={paletteOverlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`absolute inset-0 backdrop-blur-[14px] ${
              agentShell ? "bg-black/25" : "bg-[#0a0a12]/52"
            }`}
            aria-label="Close command palette"
            onClick={close}
          />
          <motion.div
            variants={palettePanel}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`relative z-10 w-full max-w-xl overflow-hidden rounded-xl border shadow-2xl ${
              agentShell
                ? "border-black/[0.08] bg-white/95 text-neutral-900 backdrop-blur-2xl"
                : "glass-liquid border-black/[0.06] text-[#1d1d1f]"
            }`}
            style={
              agentShell
                ? { WebkitBackdropFilter: "blur(40px) saturate(140%)" }
                : { WebkitBackdropFilter: "blur(48px) saturate(200%)" }
            }
          >
            <div
              className={`border-b px-4 py-3 ${
                agentShell ? "border-black/[0.06]" : "border-black/[0.06]"
              }`}
            >
              <p id={titleId} className="sr-only">
                Command palette
              </p>
              <div className="flex items-center gap-3">
                <Search
                  className={`h-5 w-5 flex-shrink-0 ${
                    agentShell ? "text-neutral-400" : "text-[#6e6e73]"
                  }`}
                  aria-hidden
                />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  className={`min-w-0 flex-1 bg-transparent text-[16px] outline-none ${
                    agentShell
                      ? "text-neutral-900 placeholder:text-neutral-400"
                      : "text-[#1d1d1f] placeholder:text-[#a1a1a6]"
                  }`}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <kbd
                  className={`hidden rounded-md border px-2 py-0.5 font-mono text-[11px] sm:inline-block ${
                    agentShell
                      ? "border-black/[0.08] bg-neutral-100 text-neutral-500"
                      : "border-black/[0.08] bg-white/80 text-[#86868b]"
                  }`}
                >
                  esc
                </kbd>
              </div>
              {agentShell && displayName ? (
                <p className="mt-2 text-[11px] font-mono text-neutral-500">
                  Signed in as {displayName}
                </p>
              ) : null}
              <p
                className={`mt-2 text-[11px] ${agentShell ? "text-neutral-500" : "text-[#86868b]"}`}
                aria-live="polite"
              >
                {query.trim()
                  ? `${flatForNav.length} match${flatForNav.length === 1 ? "" : "es"} · real routes & workspace actions`
                  : `${flatForNav.length} destinations · type to filter`}
              </p>
            </div>
            <ul
              ref={listRef}
              className="max-h-[min(52vh,400px)] overflow-y-auto p-2"
              role="listbox"
            >
              {flatForNav.length === 0 ? (
                <li
                  className={`rounded-xl px-4 py-8 text-center text-[14px] ${
                    agentShell ? "text-neutral-500" : "text-[#6e6e73]"
                  }`}
                >
                  No matches. Try another word.
                </li>
              ) : (
                grouped.map((group) => (
                  <li key={group.section} className="mb-3 last:mb-0">
                    <p
                      className={`mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                        agentShell ? "text-neutral-400" : "text-[#86868b]"
                      }`}
                    >
                      {group.label}
                    </p>
                    <ul className="space-y-0.5" role="group">
                      {group.items.map((item) => {
                        const idx = indexById.get(item.id) ?? 0;
                        const active = idx === selectedIndex;
                        return (
                          <li key={item.id} role="none">
                            <button
                              type="button"
                              role="option"
                              aria-selected={active}
                              title={
                                item.description
                                  ? `${item.label} — ${item.description}`
                                  : item.label
                              }
                              onClick={() => onPick(item.href)}
                              onMouseEnter={() => setSelectedIndex(idx)}
                              className={`flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                                active
                                  ? agentShell
                                    ? "bg-neutral-200/80 ring-1 ring-black/[0.06]"
                                    : "bg-[#0071e3]/10"
                                  : agentShell
                                    ? "hover:bg-black/[0.04]"
                                    : "hover:bg-[#0071e3]/10"
                              }`}
                            >
                              <span
                                className={`text-[15px] font-semibold tracking-[-0.02em] ${
                                  agentShell ? "text-neutral-900" : "text-[#1d1d1f]"
                                }`}
                              >
                                {item.label}
                              </span>
                              {item.description ? (
                                <span
                                  className={`text-[12px] sm:text-right ${
                                    agentShell ? "text-neutral-500" : "text-[#86868b]"
                                  }`}
                                >
                                  {item.description}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))
              )}
            </ul>
            <div
              className={`flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 text-[11px] ${
                agentShell
                  ? "border-black/[0.06] text-neutral-500"
                  : "border-black/[0.06] text-[#86868b]"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <CornerDownLeft className="h-3.5 w-3.5" aria-hidden />
                Open · ↑↓ navigate
              </span>
              <span className="text-right font-mono">
                <kbd
                  className={`rounded border px-1.5 py-0.5 ${
                    agentShell
                      ? "border-black/[0.08] bg-neutral-100"
                      : "border-black/[0.08] bg-white/70"
                  }`}
                >
                  ⌘K
                </kbd>{" "}
                ·{" "}
                <kbd
                  className={`rounded border px-1.5 py-0.5 ${
                    agentShell
                      ? "border-black/[0.08] bg-neutral-100"
                      : "border-black/[0.08] bg-white/70"
                  }`}
                >
                  ⌘N
                </kbd>{" "}
                project
              </span>
              <Link
                href="/contact"
                className={`font-medium ${
                  agentShell ? "text-neutral-900" : "text-[#0071e3]"
                } hover:underline`}
                onClick={close}
              >
                Help
              </Link>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <PaletteContext.Provider value={value}>
      {children}
      {typeof document !== "undefined"
        ? createPortal(overlay, document.body)
        : null}
    </PaletteContext.Provider>
  );
}
