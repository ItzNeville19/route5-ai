"use client";

import {
  createContext,
  useCallback,
  useDeferredValue,
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
import { CornerDownLeft, RotateCw, Search } from "lucide-react";
import { paletteOverlay, palettePanel } from "@/lib/motion";
import {
  buildPaletteItems,
  type PaletteItem,
  type PalettePerson,
  type PaletteRecentRun,
  type PaletteSearchCommitment,
  type PaletteSection,
} from "@/lib/command-palette-items";

type PaletteContextValue = {
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const PaletteContext = createContext<PaletteContextValue | null>(null);

type PaletteApiPayload = {
  signedIn?: boolean;
  displayName?: string | null;
  primaryEmail?: string | null;
  projects?: { id: string; name: string }[];
  recentRuns?: PaletteRecentRun[];
  searchCommitments?: PaletteSearchCommitment[];
  people?: PalettePerson[];
  openActionsCount?: number;
  workspaceDbOk?: boolean;
};

const PALETTE_CACHE_TTL_MS = 45_000;
const PALETTE_MAX_RESULTS = 72;
let paletteCache: { at: number; payload: PaletteApiPayload } | null = null;

export function useCommandPalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  }
  return ctx;
}

type UiGroupKey = "jump" | "commitments" | "projects" | "people" | "actions";
const UI_GROUP_LABEL: Record<UiGroupKey, string> = {
  jump: "Jump to",
  commitments: "Commitments",
  projects: "Projects",
  people: "People",
  actions: "Actions",
};

function groupKeyForSection(section: PaletteSection): UiGroupKey {
  if (section === "activity") return "commitments";
  if (section === "projects") return "projects";
  if (section === "account") return "people";
  if (section === "workspace") return "actions";
  return "jump";
}

function groupFiltered(items: PaletteItem[]) {
  const order: UiGroupKey[] = ["jump", "commitments", "projects", "people", "actions"];
  const map = new Map<UiGroupKey, PaletteItem[]>();
  for (const item of items) {
    const key = groupKeyForSection(item.section);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return order
    .map((key) => ({
      section: key,
      label: UI_GROUP_LABEL[key],
      items: map.get(key) ?? [],
    }))
    .filter((g) => g.items.length > 0);
}

function applyPalettePayload(
  payload: PaletteApiPayload,
  setters: {
    setSignedIn: (v: boolean) => void;
    setDisplayName: (v: string | null) => void;
    setUserEmail: (v: string | null) => void;
    setProjects: (v: { id: string; name: string }[]) => void;
    setRecentRuns: (v: PaletteRecentRun[]) => void;
    setSearchCommitments: (v: PaletteSearchCommitment[]) => void;
    setPeople: (v: PalettePerson[]) => void;
    setOpenActionsCount: (v: number) => void;
  }
) {
  setters.setSignedIn(Boolean(payload.signedIn));
  setters.setDisplayName(payload.displayName ?? null);
  setters.setUserEmail(
    typeof payload.primaryEmail === "string" && payload.primaryEmail.trim()
      ? payload.primaryEmail.trim()
      : null
  );
  setters.setProjects(Array.isArray(payload.projects) ? payload.projects : []);
  setters.setRecentRuns(Array.isArray(payload.recentRuns) ? payload.recentRuns : []);
  setters.setSearchCommitments(
    Array.isArray(payload.searchCommitments) ? payload.searchCommitments : []
  );
  setters.setPeople(Array.isArray(payload.people) ? payload.people : []);
  setters.setOpenActionsCount(
    typeof payload.openActionsCount === "number" && payload.openActionsCount >= 0
      ? payload.openActionsCount
      : 0
  );
}

const TOKEN_SPLIT = /[^a-z0-9]+/i;

/** Longer query matches shorter stem (e.g. "customization" ↔ "customize") without a stemmer. */
function overlapScore(
  query: string,
  chunk: string,
  minStem = 4
): number {
  if (!chunk || chunk.length < minStem) return 0;
  if (query === chunk) return 72;
  if (chunk.startsWith(query)) return query.length >= 2 ? 48 : 0;
  if (query.startsWith(chunk)) return 44;
  if (chunk.includes(query) && query.length >= 4) return 28;
  if (query.includes(chunk) && chunk.length >= 4) return 30;
  return 0;
}

function rankPaletteItem(item: PaletteItem, query: string): number {
  const label = item.label.toLowerCase();
  const desc = (item.description ?? "").toLowerCase();
  const keys = (item.keywords ?? []).map((k) => k.toLowerCase());
  const compactLabel = label.replace(/[\s/_-]+/g, "");
  const compactQuery = query.replace(/[\s/_-]+/g, "");
  let score = 0;

  if (label === query) score += 220;
  else if (label.startsWith(query)) score += 160;
  else if (label.includes(query)) score += 95;

  if (desc.startsWith(query)) score += 40;
  else if (desc.includes(query)) score += 24;

  for (const word of label.split(TOKEN_SPLIT)) {
    const m = overlapScore(query, word, 4);
    if (m) score += Math.min(m, 62);
  }
  for (const word of desc.split(TOKEN_SPLIT)) {
    const m = overlapScore(query, word, 4);
    if (m) score += Math.min(m, 22);
  }

  for (const k of keys) {
    if (k === query) score += 72;
    else if (k.startsWith(query)) score += 38;
    else if (k.includes(query)) score += 16;
    else score += overlapScore(query, k, 4);
  }

  // Tolerate users typing without spaces/punctuation.
  if (compactQuery.length >= 3 && compactLabel.includes(compactQuery)) {
    score += 42;
  }
  // Lightweight fuzzy path for "close enough" terms in the search bar.
  if (score === 0 && compactQuery.length >= 3) {
    let qi = 0;
    for (let i = 0; i < compactLabel.length && qi < compactQuery.length; i++) {
      if (compactLabel[i] === compactQuery[qi]) qi += 1;
    }
    if (qi === compactQuery.length) score += 20;
  }

  if (item.section === "agent") score += 18;
  if (item.section === "workspace") score += 12;
  if (item.section === "projects") score += 9;
  return score;
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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [recentRuns, setRecentRuns] = useState<PaletteRecentRun[]>([]);
  const [searchCommitments, setSearchCommitments] = useState<PaletteSearchCommitment[]>([]);
  const [people, setPeople] = useState<PalettePerson[]>([]);
  const [openActionsCount, setOpenActionsCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadingPalette, setLoadingPalette] = useState(false);
  const inFlightRef = useRef<AbortController | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const deferredQuery = useDeferredValue(query);

  const loadPalette = useCallback(async (forceNetwork = false) => {
    if (!forceNetwork && paletteCache && Date.now() - paletteCache.at < PALETTE_CACHE_TTL_MS) {
      applyPalettePayload(paletteCache.payload, {
        setSignedIn,
        setDisplayName,
        setUserEmail,
        setProjects,
        setRecentRuns,
        setSearchCommitments,
        setPeople,
        setOpenActionsCount,
      });
      return;
    }

    inFlightRef.current?.abort();
    const ctrl = new AbortController();
    inFlightRef.current = ctrl;
    setLoadingPalette(true);
    try {
      const res = await fetch("/api/workspace/palette", {
        credentials: "same-origin",
        signal: ctrl.signal,
      });
      const data = (await res.json().catch(() => ({}))) as PaletteApiPayload;
      paletteCache = { at: Date.now(), payload: data };
      applyPalettePayload(data, {
        setSignedIn,
        setDisplayName,
        setUserEmail,
        setProjects,
        setRecentRuns,
        setSearchCommitments,
        setPeople,
        setOpenActionsCount,
      });
    } catch {
      if (ctrl.signal.aborted) return;
      setSignedIn(false);
      setDisplayName(null);
      setUserEmail(null);
      setProjects([]);
      setRecentRuns([]);
      setSearchCommitments([]);
      setPeople([]);
      setOpenActionsCount(0);
    } finally {
      if (!ctrl.signal.aborted) setLoadingPalette(false);
    }
  }, []);

  useEffect(() => {
    void loadPalette(false);
    return () => {
      inFlightRef.current?.abort();
    };
  }, [loadPalette]);

  useEffect(() => {
    if (!open) return;
    void loadPalette(false);
  }, [open, loadPalette]);

  useEffect(() => {
    const onRefresh = () => {
      if (open) void loadPalette(true);
    };
    window.addEventListener("route5:project-updated", onRefresh);
    return () => window.removeEventListener("route5:project-updated", onRefresh);
  }, [open, loadPalette]);

  /** App shell routes imply a signed-in session; palette API may lag — avoids wrong marketing-only routes on first ⌘K. */
  const likelyWorkspaceSession =
    !!pathname &&
    (pathname.startsWith("/feed") ||
      pathname.startsWith("/projects") ||
      pathname === "/desk" ||
      pathname.startsWith("/desk") ||
      pathname.startsWith("/workspace") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/marketplace") ||
      pathname.startsWith("/integrations") ||
      pathname.startsWith("/docs") ||
      pathname === "/settings" ||
      pathname === "/overview" ||
      pathname === "/leadership" ||
      pathname === "/team-insights" ||
      pathname === "/capture" ||
      pathname.startsWith("/account"));
  const signedInEffective = signedIn || likelyWorkspaceSession;

  const directory = useMemo(
    () =>
      buildPaletteItems({
        signedIn: signedInEffective,
        displayName,
        userEmail,
        projects,
        recentRuns,
        searchCommitments,
        people,
        openActionsCount,
      }),
    [
      signedInEffective,
      displayName,
      userEmail,
      projects,
      recentRuns,
      searchCommitments,
      people,
      openActionsCount,
    ]
  );

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return directory.slice(0, PALETTE_MAX_RESULTS);
    const ranked = directory
      .map((item) => ({ item, score: rankPaletteItem(item, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
      .slice(0, PALETTE_MAX_RESULTS)
      .map((x) => x.item);
    return ranked;
  }, [deferredQuery, directory]);

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

  useEffect(() => {
    const onExternalClose = () => close();
    window.addEventListener("route5:palette-close", onExternalClose);
    return () => window.removeEventListener("route5:palette-close", onExternalClose);
  }, [close]);

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

  useEffect(() => {
    if (!open || flatForNav.length === 0) return;
    const seen = new Set<string>();
    for (const item of flatForNav) {
      if (!item.href) continue;
      const clean = item.href.split("#")[0]?.split("?")[0] ?? item.href;
      if (!clean || seen.has(clean)) continue;
      seen.add(clean);
      router.prefetch(clean);
      if (seen.size >= 14) break;
    }
  }, [open, flatForNav, router]);

  const onPick = useCallback(
    (item: PaletteItem) => {
      if (item.action === "open-capture") {
        close();
        window.setTimeout(() => {
          window.dispatchEvent(new Event("route5:capture-open"));
        }, 0);
        return;
      }
      if (item.action === "open-new-project") {
        close();
        window.setTimeout(() => {
          window.dispatchEvent(new Event("route5:new-project-open"));
        }, 0);
        return;
      }
      const href = item.href ?? "/desk";
      close();
      const hashIdx = href.indexOf("#");
      window.requestAnimationFrame(() => {
        if (hashIdx !== -1) {
          const path = href.slice(0, hashIdx);
          const hash = href.slice(hashIdx + 1);
          router.push(`${path}#${hash}`);
          if (path === "/overview") {
            window.setTimeout(() => {
              document.getElementById("new-project-name")?.focus();
            }, 120);
          }
        } else {
          router.push(href);
        }
      });
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
          onPick(item);
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
      pathname === "/feed" ||
      pathname === "/capture" ||
      pathname === "/overview" ||
      pathname === "/leadership" ||
      pathname === "/team-insights" ||
      pathname === "/desk" ||
      pathname === "/settings" ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/marketplace") ||
      pathname.startsWith("/workspace") ||
      pathname.startsWith("/integrations") ||
      pathname.startsWith("/docs") ||
      pathname === "/support" ||
      pathname.startsWith("/account"));
  const agentShell = signedInEffective && inAppShell;

  const placeholder = agentShell
    ? `Search — Desk, Capture, Marketplace, Team, Settings${displayName ? ` · ${displayName}` : ""}…`
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
            className="absolute inset-0 bg-black/60"
            aria-label="Close command palette"
            onClick={close}
          />
          <motion.div
            variants={palettePanel}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`relative z-10 w-full max-w-[560px] overflow-hidden rounded-lg border shadow-2xl ${
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
            <div className="border-b border-black/[0.06] px-4 py-3">
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
                  className={`min-h-[36px] min-w-0 flex-1 bg-transparent text-[15px] outline-none ${
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
              <p
                className={`mt-2 text-[11px] ${agentShell ? "text-neutral-500" : "text-[#86868b]"}`}
                aria-live="polite"
              >
                {loadingPalette
                  ? "Refreshing live destinations..."
                  : query.trim()
                  ? `${flatForNav.length} match${flatForNav.length === 1 ? "" : "es"} · opens the real page`
                  : `${flatForNav.length} destinations · hidden screens are in “More screens”`}
              </p>
            </div>
            <ul
              ref={listRef}
              className="max-h-[400px] overflow-y-auto p-2"
              role="listbox"
            >
              {flatForNav.length === 0 ? (
                <li
                  className={`rounded-xl px-4 py-8 text-center text-[14px] ${
                    agentShell ? "text-neutral-500" : "text-[#6e6e73]"
                  }`}
                >
                  <p>No matches. Try another word.</p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        router.push("/desk");
                        close();
                      }}
                      className="rounded-lg border border-black/10 bg-white/80 px-2.5 py-1.5 text-[12px] font-medium text-neutral-700 transition hover:bg-white"
                    >
                      Open feed
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        window.dispatchEvent(new Event("route5:capture-open"));
                        close();
                      }}
                      className="rounded-lg border border-black/10 bg-white/80 px-2.5 py-1.5 text-[12px] font-medium text-neutral-700 transition hover:bg-white"
                    >
                      Open capture
                    </button>
                  </div>
                </li>
              ) : (
                grouped.map((group) => (
                  <li key={group.section} className="mb-3 last:mb-0">
                    <p
                      className={`mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.05em] ${
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
                              onClick={() => onPick(item)}
                              onMouseEnter={() => {
                                setSelectedIndex(idx);
                                if (item.href) {
                                  const clean = item.href.split("#")[0]?.split("?")[0] ?? item.href;
                                  if (clean) router.prefetch(clean);
                                }
                              }}
                              className={`flex h-9 w-full items-center gap-3 rounded-[4px] border-l-2 border-transparent px-3 text-left transition ${
                                active
                                  ? agentShell
                                    ? "border-l-r5-accent bg-neutral-200/80 ring-1 ring-black/[0.06]"
                                    : "border-l-r5-accent bg-[#0071e3]/10"
                                  : agentShell
                                    ? "hover:bg-black/[0.04]"
                                    : "hover:bg-[#0071e3]/10"
                              }`}
                            >
                              <span
                                className={`truncate text-[13px] font-medium ${
                                  agentShell ? "text-neutral-900" : "text-[#1d1d1f]"
                                }`}
                              >
                                {item.label}
                              </span>
                              {item.description ? (
                                <span
                                  className={`ml-auto truncate text-[13px] ${
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
                <RotateCw className="mr-1 inline h-3.5 w-3.5" aria-hidden />
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
                new project ·{" "}
                <kbd
                  className={`rounded border px-1.5 py-0.5 ${
                    agentShell
                      ? "border-black/[0.08] bg-neutral-100"
                      : "border-black/[0.08] bg-white/70"
                  }`}
                >
                  ⌘\
                </kbd>{" "}
                sidebar
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
