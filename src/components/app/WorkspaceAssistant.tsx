"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useUser } from "@clerk/nextjs";
import {
  Eraser,
  Maximize2,
  MessageCircle,
  Minimize2,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CommandOrbIcon } from "@/components/brand/CommandOrbIcon";
import { MERIDIAN_FULL, MERIDIAN_SHORT, MERIDIAN_TAGLINE } from "@/lib/assistant-brand";
import { useAlignedMinuteTick } from "@/hooks/use-aligned-minute-tick";
import { hourInTimezone } from "@/lib/timezone-date";
import { getBrowserIanaTimezone } from "@/lib/workspace-location";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import type { RelayMsg } from "@/lib/relay-thread-types";
import {
  createEmptyThread,
  ensureActiveThread,
  loadRelayThreadStore,
  saveRelayThreadStore,
  threadTitleFromMessages,
  type RelayThreadStore,
} from "@/lib/relay-thread-storage";
import { seededShuffle, stableHash } from "@/lib/stable-hash";

const MEMORY_KEY_LEGACY = "route5:assistantMemory.v1";

function memoryStorageKey(userId?: string | null): string {
  const u = userId?.trim();
  return u ? `route5:assistantMemory.v1:user:${u}` : MEMORY_KEY_LEGACY;
}

function loadMemory(userId?: string | null): string {
  if (typeof window === "undefined") return "";
  try {
    const k = memoryStorageKey(userId);
    let v = localStorage.getItem(k) ?? "";
    if (!v && userId?.trim()) {
      const leg = localStorage.getItem(MEMORY_KEY_LEGACY);
      if (leg) {
        v = leg;
        localStorage.setItem(k, leg.slice(0, 6000));
      }
    }
    if (!v && !userId?.trim()) {
      v = localStorage.getItem(MEMORY_KEY_LEGACY) ?? "";
    }
    return v;
  } catch {
    return "";
  }
}

function saveMemory(text: string, userId?: string | null) {
  try {
    localStorage.setItem(memoryStorageKey(userId), text.slice(0, 6000));
  } catch {
    /* ignore */
  }
}

type SuggestionChip = {
  prompt: string;
  label: string;
  learnMoreHref: string;
  /** Extra tokens for matching while typing (lowercase). */
  keywords?: string[];
};

/** Compact horizontal row — show a few more since chips are single-line pills. */
const MAX_VISIBLE_SUGGESTIONS = 5;

const IDLE_BY_TIME_LABELS: Record<"night" | "dawn" | "day" | "dusk", ReadonlySet<string>> = {
  night: new Set(["Onboarding replay", "Command palette ⌘K", "Privacy & data", "What should I do next?"]),
  dawn: new Set(["Desk capture flow", "What should I do next?", "Duplicate a run", "Writing better prompts"]),
  day: new Set([
    "Projects vs extractions",
    "Linear & GitHub",
    "Team alignment",
    "Marketplace & installs",
    "Action items & completion",
  ]),
  dusk: new Set(["Plans & limits", "Team alignment", "Customize Overview", "What should I do next?"]),
};

function timeBandFromHour(h: number): "night" | "dawn" | "day" | "dusk" {
  if (h >= 22 || h < 5) return "night";
  if (h < 9) return "dawn";
  if (h < 17) return "day";
  if (h < 21) return "dusk";
  return "night";
}

const ALL_SUGGESTION_CHIPS: SuggestionChip[] = [
  {
    label: "What should I do next?",
    prompt: "What should I do next in Route5 given my workspace?",
    learnMoreHref: "/docs/product",
    keywords: ["next", "start", "priority", "workspace", "help", "begin", "first", "stuck"],
  },
  {
    label: "Projects vs extractions",
    prompt: "Explain projects vs extractions in one paragraph.",
    learnMoreHref: "/docs/product",
    keywords: ["project", "extraction", "difference", "vs", "run", "container", "where", "save"],
  },
  {
    label: "Linear & GitHub",
    prompt: "How do I use Linear or GitHub in Route5?",
    learnMoreHref: "/integrations",
    keywords: ["linear", "github", "issue", "import", "connector", "integration", "ticket", "pr", "repo"],
  },
  {
    label: "Team alignment",
    prompt: "How do Team insights, Overview, and Reports stay aligned?",
    learnMoreHref: "/team-insights",
    keywords: ["team", "alignment", "standup", "insights", "reports", "overview", "same", "share", "org"],
  },
  {
    label: "Duplicate a run",
    prompt: "How do I duplicate an extraction run inside a project?",
    learnMoreHref: "/docs/product",
    keywords: ["duplicate", "copy", "run", "extraction", "clone", "again", "branch", "fork", "variant"],
  },
  {
    label: "Marketplace & installs",
    prompt: "What does installing from the marketplace do in my workspace?",
    learnMoreHref: "/marketplace",
    keywords: ["marketplace", "install", "app", "catalog", "store", "integration", "browse", "tile"],
  },
  {
    label: "Plans & limits",
    prompt: "How do project and monthly extraction limits work?",
    learnMoreHref: "/account/plans",
    keywords: ["plan", "limit", "billing", "tier", "month", "quota", "usage", "upgrade", "price"],
  },
  {
    label: "Desk capture flow",
    prompt: "Walk me through Desk: pick project, paste, run extraction.",
    learnMoreHref: "/desk",
    keywords: ["desk", "paste", "capture", "inbox", "compose", "raw", "input", "template", "preset"],
  },
  {
    label: "Figma import",
    prompt: "How does Figma file import into Route5 work?",
    learnMoreHref: "/integrations/figma",
    keywords: ["figma", "design", "file", "frame", "token", "comments", "layers"],
  },
  {
    label: "Action items & completion",
    prompt: "How do action checklists connect to workspace completion metrics?",
    learnMoreHref: "/docs/product",
    keywords: ["action", "checkbox", "complete", "done", "tasks", "follow", "metrics", "velocity"],
  },
  {
    label: "Markdown export",
    prompt: "How do I copy an extraction as Markdown from a project?",
    learnMoreHref: "/docs/product",
    keywords: ["markdown", "export", "copy", "md", "share", "document"],
  },
  {
    label: "Command palette ⌘K",
    prompt: "What can I do from the command palette?",
    learnMoreHref: "/docs/product",
    keywords: ["palette", "search", "keyboard", "shortcut", "command", "jump", "navigate"],
  },
  {
    label: "Privacy & data",
    prompt: "Where is workspace data stored and who can see it?",
    learnMoreHref: "/docs/privacy",
    keywords: ["privacy", "data", "sqlite", "supabase", "security", "retention", "clerk"],
  },
  {
    label: "Onboarding replay",
    prompt: "How do I replay guided onboarding?",
    learnMoreHref: "/onboarding?replay=1",
    keywords: ["onboarding", "tour", "setup", "guided", "replay", "intro"],
  },
  {
    label: "Customize Overview",
    prompt: "How do I change Overview shortcuts and subtitle?",
    learnMoreHref: "/workspace/customize",
    keywords: ["customize", "subtitle", "shortcuts", "layout", "hero", "overview", "personalize"],
  },
  {
    label: "Writing better prompts",
    prompt: "Tips for pasting messy threads so extraction quality stays high.",
    learnMoreHref: "/docs/product",
    keywords: ["write", "prompt", "paste", "thread", "slack", "email", "notes", "quality", "context"],
  },
  {
    label: "Slack connector",
    prompt: "What is the Slack integration scope in Route5 today?",
    learnMoreHref: "/integrations/slack",
    keywords: ["slack", "webhook", "bot", "channel", "notify"],
  },
  {
    label: "Google Workspace",
    prompt: "How do I use the Google Workspace route with Desk?",
    learnMoreHref: "/integrations/google",
    keywords: ["google", "gmail", "docs", "workspace", "calendar"],
  },
  {
    label: "Roadmap vs shipped",
    prompt: "What is explicitly roadmap versus live in this product?",
    learnMoreHref: "/docs/roadmap",
    keywords: ["roadmap", "shipped", "planned", "future", "vapor", "honest"],
  },
];

function tokenizeComposer(s: string): string[] {
  return s
    .toLowerCase()
    .trim()
    .split(/[\s,.;:!?()[\]{}'"`]+/)
    .filter((t) => t.length >= 1);
}

function scoreChip(chip: SuggestionChip, tokens: string[], composerLower: string): number {
  const blob = `${chip.label} ${chip.prompt} ${(chip.keywords ?? []).join(" ")}`.toLowerCase();
  const words = blob.split(/[\s/&]+/).filter(Boolean);
  let score = 0;
  if (composerLower.length >= 3 && blob.includes(composerLower)) {
    score += 24;
  }
  const tail = composerLower.split(/\s+/).slice(-4).join(" ");
  if (tail.length >= 4 && blob.includes(tail)) {
    score += 14;
  }
  for (const t of tokens) {
    if (t.length < 2) continue;
    if (blob.includes(t)) score += 5;
    if (chip.label.toLowerCase().includes(t)) score += 3;
    for (const w of words) {
      if (w.length >= 3 && (w.startsWith(t) || t.startsWith(w))) score += 4;
    }
    for (const kw of chip.keywords ?? []) {
      if (kw.startsWith(t) || t.startsWith(kw)) score += 4;
    }
  }
  return score;
}

function pickSuggestionChips(
  composer: string,
  userId: string | undefined,
  hourLocal: number
): SuggestionChip[] {
  const trimmed = composer.trim();
  const composerLower = trimmed.toLowerCase();
  const tokens = tokenizeComposer(trimmed);
  const hourBucket = Math.floor(Date.now() / 3_600_000);
  const band = timeBandFromHour(hourLocal);
  const idleSeed = stableHash(`${userId ?? "anon"}:${hourBucket}:${band}:relay-chips`);

  if (tokens.length === 0) {
    const preferred = ALL_SUGGESTION_CHIPS.filter((c) => IDLE_BY_TIME_LABELS[band].has(c.label));
    const rest = ALL_SUGGESTION_CHIPS.filter((c) => !IDLE_BY_TIME_LABELS[band].has(c.label));
    const merged = [
      ...seededShuffle(preferred, idleSeed),
      ...seededShuffle(rest, idleSeed + 7),
    ];
    return merged.slice(0, MAX_VISIBLE_SUGGESTIONS);
  }

  const scored = ALL_SUGGESTION_CHIPS.map((s) => ({
    s,
    sc: scoreChip(s, tokens, composerLower),
  })).sort((a, b) => {
    if (b.sc !== a.sc) return b.sc - a.sc;
    return stableHash(a.s.label + composerLower) - stableHash(b.s.label + composerLower);
  });

  const positive = scored.filter((x) => x.sc > 0);
  if (positive.length > 0) {
    return positive.slice(0, MAX_VISIBLE_SUGGESTIONS).map((x) => x.s);
  }

  const anyLetter = scored
    .filter((x) => {
      const blob = `${x.s.label} ${x.s.prompt}`.toLowerCase();
      return tokens.some((t) => t.length >= 2 && blob.includes(t));
    })
    .slice(0, MAX_VISIBLE_SUGGESTIONS)
    .map((x) => x.s);
  if (anyLetter.length > 0) {
    return anyLetter;
  }

  return seededShuffle(ALL_SUGGESTION_CHIPS, stableHash(composerLower + String(hourBucket))).slice(
    0,
    MAX_VISIBLE_SUGGESTIONS
  );
}

function greetingPhrase(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Hi";
}

function welcomeLine(opts: {
  hour: number;
  /** Clerk given name only — we don’t fake “Hi emailprefix” as a real name. */
  knowsYou: boolean;
  givenName: string;
  memoryTrim: string;
}): RelayMsg {
  const { hour, knowsYou, givenName, memoryTrim } = opts;
  const g = greetingPhrase(hour);
  const mem =
    memoryTrim.length > 0
      ? " I’m using the notes you’ve asked me to remember."
      : "";
  const body = knowsYou
    ? `${g}, ${givenName} — I’m ${MERIDIAN_SHORT}.${mem} Ask about your workspace or tap a quick idea.`
    : `${g} — I’m ${MERIDIAN_SHORT}.${mem} Ask about your workspace or tap a quick idea.`;
  return {
    id: "w",
    role: "assistant",
    text: body,
    ts: Date.now(),
  };
}

export default function WorkspaceAssistant() {
  const { user } = useUser();
  const { prefs } = useWorkspaceExperience();
  const minuteTick = useAlignedMinuteTick();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [memory, setMemory] = useState("");
  const [store, setStore] = useState<RelayThreadStore>(() =>
    ensureActiveThread(loadRelayThreadStore())
  );
  const [full, setFull] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const knowsYou = Boolean(user?.firstName?.trim());
  const givenName = user?.firstName?.trim() ?? "";
  /** API / error copy only — not used in greeting unless `knowsYou`. */
  const firstName =
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "there";

  const effectiveTz = prefs.workspaceTimezone?.trim() || getBrowserIanaTimezone();
  const hourLocal = useMemo(() => {
    void minuteTick;
    return hourInTimezone(effectiveTz);
  }, [effectiveTz, minuteTick]);

  const active = store.threads[store.activeId];
  const messages = useMemo(
    () => active?.messages ?? [],
    [active?.messages]
  );

  const threadList = Object.values(store.threads).sort((a, b) => b.updatedAt - a.updatedAt);

  const suggestionChips = useMemo(
    () => pickSuggestionChips(input, user?.id, hourLocal),
    [input, user?.id, hourLocal]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const uid = user?.id;
    setMemory(loadMemory(uid));
    setStore(ensureActiveThread(loadRelayThreadStore(uid)));
  }, [user?.id]);

  useEffect(() => {
    saveRelayThreadStore(store, user?.id);
  }, [store, user?.id]);

  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    const openEv = () => setOpen(true);
    window.addEventListener("route5:assistant-toggle", toggle);
    window.addEventListener("route5:assistant-open", openEv);
    return () => {
      window.removeEventListener("route5:assistant-toggle", toggle);
      window.removeEventListener("route5:assistant-open", openEv);
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, sending]);

  const patchActiveMessages = useCallback((nextMessages: RelayMsg[]) => {
    setStore((s) => {
      const t = s.threads[s.activeId];
      if (!t) return s;
      const title = threadTitleFromMessages(nextMessages);
      return {
        ...s,
        threads: {
          ...s.threads,
          [s.activeId]: {
            ...t,
            messages: nextMessages,
            title,
            updatedAt: Date.now(),
          },
        },
      };
    });
  }, []);

  const ensureWelcome = useCallback(() => {
    setStore((s) => {
      const t = s.threads[s.activeId];
      if (!t || t.messages.length > 0) return s;
      return {
        ...s,
        threads: {
          ...s.threads,
          [s.activeId]: {
            ...t,
            messages: [
              welcomeLine({
                hour: hourLocal,
                knowsYou,
                givenName,
                memoryTrim: memory.trim(),
              }),
            ],
            updatedAt: Date.now(),
          },
        },
      };
    });
  }, [hourLocal, knowsYou, givenName, memory]);

  useEffect(() => {
    if (open) {
      ensureWelcome();
      window.setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [open, ensureWelcome]);

  const newChat = useCallback(() => {
    const nt = createEmptyThread();
    setStore((s) => ({
      activeId: nt.id,
      threads: {
        ...s.threads,
        [nt.id]: {
          ...nt,
          messages: [
            welcomeLine({
              hour: hourLocal,
              knowsYou,
              givenName,
              memoryTrim: memory.trim(),
            }),
          ],
        },
      },
    }));
  }, [hourLocal, knowsYou, givenName, memory]);

  const selectThread = useCallback((id: string) => {
    setStore((s) => (s.threads[id] ? { ...s, activeId: id } : s));
  }, []);

  const beginRename = useCallback((id: string) => {
    const t = store.threads[id];
    if (!t) return;
    const title = t.title?.trim() || threadTitleFromMessages(t.messages);
    setRenameTargetId(id);
    setRenameDraft(title);
    window.setTimeout(() => renameInputRef.current?.focus(), 0);
  }, [store.threads]);

  const commitRename = useCallback(() => {
    if (!renameTargetId) return;
    const title = renameDraft.trim() || "Chat";
    setStore((s) => {
      const t = s.threads[renameTargetId];
      if (!t) return s;
      return {
        ...s,
        threads: {
          ...s.threads,
          [renameTargetId]: { ...t, title, updatedAt: Date.now() },
        },
      };
    });
    setRenameTargetId(null);
    setRenameDraft("");
  }, [renameTargetId, renameDraft]);

  const cancelRename = useCallback(() => {
    setRenameTargetId(null);
    setRenameDraft("");
  }, []);

  const deleteThread = useCallback(
    (id: string) => {
      if (!window.confirm("Delete this conversation?")) return;
      setStore((s) => {
        if (!s.threads[id]) return s;
        const rest = { ...s.threads };
        delete rest[id];
        const ids = Object.keys(rest);
        if (ids.length === 0) {
          const nt = createEmptyThread();
          return {
            activeId: nt.id,
            threads: {
              [nt.id]: {
                ...nt,
                messages: [
                  welcomeLine({
                    hour: hourLocal,
                    knowsYou,
                    givenName,
                    memoryTrim: memory.trim(),
                  }),
                ],
              },
            },
          };
        }
        const nextActive = s.activeId === id ? ids[0]! : s.activeId;
        return { activeId: nextActive, threads: rest };
      });
    },
    [hourLocal, knowsYou, givenName, memory]
  );

  function clearThread() {
    patchActiveMessages([
      {
        id: `w-${Date.now()}`,
        role: "assistant",
        text: welcomeLine({
          hour: hourLocal,
          knowsYou,
          givenName,
          memoryTrim: memory.trim(),
        }).text,
        ts: Date.now(),
      },
    ]);
  }

  /** Load user message into composer and remove it (and later turns) so the user can send again. */
  const beginEditUserMessage = useCallback(
    (msgId: string) => {
      const idx = messages.findIndex((m) => m.id === msgId);
      if (idx < 0) return;
      const msg = messages[idx];
      if (msg.role !== "user") return;
      setInput(msg.text);
      patchActiveMessages(messages.slice(0, idx));
      window.setTimeout(() => textareaRef.current?.focus(), 0);
    },
    [messages, patchActiveMessages]
  );

  async function send(override?: string) {
    const raw = (override ?? input).trim();
    if (!raw || sending) return;
    setInput("");
    const userMsg: RelayMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      text: raw,
      ts: Date.now(),
    };
    patchActiveMessages([...messages, userMsg]);

    let mem = memory;
    if (raw.toLowerCase().includes("remember")) {
      mem = `${memory}\n${raw}`.trim();
      setMemory(mem);
      saveMemory(mem, user?.id);
    }

    setSending(true);
    const msgsForApi = [...messages, userMsg];
    const conversation = msgsForApi
      .filter((m) => m.text.trim().length > 0)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.text.trim(),
      }));
    try {
      const res = await fetch("/api/workspace/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          conversation,
          memory: mem,
          firstName,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
      };

      let text: string;
      if (!res.ok) {
        const err =
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : "";
        if (res.status === 401) {
          text = "Sign in again to use Relay — your session may have expired.";
        } else if (err) {
          text = err;
        } else {
          text = "Something went wrong. Try again in a moment.";
        }
      } else {
        const reply = typeof data.reply === "string" ? data.reply.trim() : "";
        text =
          reply ||
          "Got it — ask another question, or tap a shortcut below.";
      }

      patchActiveMessages([
        ...msgsForApi,
        { id: `a-${Date.now()}`, role: "assistant", text, ts: Date.now() },
      ]);
    } catch {
      patchActiveMessages([
        ...msgsForApi,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: `Couldn’t reach ${MERIDIAN_SHORT}. Check your connection and try again.`,
          ts: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={
          open
            ? "Close workspace assistant"
            : "Open assistant — answers about Route5 using your live workspace context"
        }
        className="pointer-events-auto fixed bottom-5 right-5 z-[60000] flex h-14 w-14 touch-manipulation items-center justify-center rounded-full bg-[#34c759] text-white shadow-[0_8px_32px_rgba(52,199,89,0.45)] transition hover:scale-[1.03] active:scale-[0.98] md:bottom-8 md:right-8"
        style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}
        aria-label={open ? `Close ${MERIDIAN_SHORT}` : `Open ${MERIDIAN_SHORT}`}
      >
        {open ? <X className="h-7 w-7" strokeWidth={2} /> : <MessageCircle className="h-7 w-7" strokeWidth={2} />}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="sheet"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={`pointer-events-auto fixed z-[60000] flex flex-col overflow-hidden rounded-[1.35rem] border border-black/[0.1] bg-[#000000] shadow-[0_24px_80px_rgba(0,0,0,0.45)] ${
              full
                ? "inset-3 max-h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] sm:inset-5 sm:max-h-[calc(100vh-2.5rem)] sm:w-[calc(100vw-2.5rem)]"
                : "bottom-[5.5rem] right-5 max-h-[min(92vh,820px)] w-[min(100vw-2rem,580px)] md:bottom-[6rem] md:right-8"
            }`}
            role="dialog"
            aria-label={MERIDIAN_FULL}
          >
            <div className="flex min-h-0 min-w-0 flex-1 flex-row">
              <aside
                className="hidden w-[132px] shrink-0 flex-col border-r border-white/[0.08] bg-[#0a0a0c] sm:flex"
                aria-label="Chat history"
              >
                <button
                  type="button"
                  onClick={newChat}
                  className="mx-2 mt-2 inline-flex items-center justify-center gap-1 rounded-lg bg-[#2c2c2e] px-2 py-2 text-[11px] font-semibold text-white transition hover:bg-[#3a3a3c]"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  New
                </button>
                <div className="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-1.5 pb-2">
                  {threadList.map((th) => (
                    <div
                      key={th.id}
                      className={`group flex items-start gap-0.5 rounded-lg p-0.5 ${
                        th.id === store.activeId ? "bg-white/[0.08]" : ""
                      }`}
                    >
                      {renameTargetId === th.id ? (
                        <div className="min-w-0 flex-1 px-0.5 py-0.5" data-rename-inline>
                          <input
                            ref={renameInputRef}
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitRename();
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                cancelRename();
                              }
                            }}
                            className="w-full rounded-md border border-white/[0.2] bg-[#2c2c2e] px-2 py-1.5 text-[11px] text-white placeholder:text-[#636366] focus:border-[#0a84ff] focus:outline-none"
                            placeholder="Chat title"
                            aria-label="Rename conversation"
                          />
                          <div className="mt-1 flex gap-1">
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => commitRename()}
                              className="rounded bg-[#0a84ff] px-2 py-0.5 text-[10px] font-semibold text-white"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => cancelRename()}
                              className="rounded border border-white/[0.15] px-2 py-0.5 text-[10px] font-medium text-[#e5e5ea]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => selectThread(th.id)}
                            className={`min-w-0 flex-1 rounded-md px-1.5 py-1.5 text-left text-[11px] leading-snug transition ${
                              th.id === store.activeId
                                ? "text-white"
                                : "text-[#8e8e93] hover:bg-white/[0.06] hover:text-white"
                            }`}
                          >
                            <span className="line-clamp-3">{th.title || "Chat"}</span>
                          </button>
                          <div className="flex shrink-0 flex-col gap-0.5 pt-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                beginRename(th.id);
                              }}
                              className="rounded p-0.5 text-[#8e8e93] hover:bg-white/[0.1] hover:text-white"
                              title="Rename"
                              aria-label="Rename conversation"
                            >
                              <Pencil className="h-3 w-3" strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteThread(th.id);
                              }}
                              className="rounded p-0.5 text-[#8e8e93] hover:bg-white/[0.1] hover:text-red-300"
                              title="Delete"
                              aria-label="Delete conversation"
                            >
                              <Trash2 className="h-3 w-3" strokeWidth={2} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </aside>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="shrink-0 border-b border-white/[0.08] bg-[#0a0a0c] px-2 py-1.5 sm:hidden">
                  <label className="sr-only" htmlFor="relay-thread-select">
                    Conversation
                  </label>
                  <select
                    id="relay-thread-select"
                    value={store.activeId}
                    onChange={(e) => selectThread(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.12] bg-[#2c2c2e] px-2 py-1.5 text-[12px] text-white"
                  >
                    {threadList.map((th) => (
                      <option key={th.id} value={th.id}>
                        {th.title || "Chat"}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={newChat}
                    className="mt-1.5 w-full rounded-lg border border-white/[0.1] py-1.5 text-[11px] font-semibold text-[#0a84ff]"
                  >
                    New chat
                  </button>
                </div>

                <header className="flex shrink-0 items-center gap-2 border-b border-white/[0.08] bg-[#1c1c1e] px-2 py-2 sm:gap-3 sm:pl-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full p-2 text-[#0a84ff] text-[16px] font-normal leading-none hover:bg-white/[0.06]"
                    aria-label="Close"
                  >
                    <span className="text-[17px] leading-none">‹</span>
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col items-center sm:items-start">
                    <div className="flex items-center gap-2">
                      <span className="flex shrink-0 items-center justify-center" aria-hidden>
                        <CommandOrbIcon size="md" />
                      </span>
                      <div className="min-w-0 text-left">
                        <p className="truncate text-[14px] font-semibold text-white sm:text-[15px]">{MERIDIAN_SHORT}</p>
                        <p className="truncate text-[10px] text-[#8e8e93] sm:text-[11px]">{MERIDIAN_TAGLINE}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFull((v) => !v)}
                    className="rounded-full p-2 text-[#8e8e93] hover:bg-white/[0.08] hover:text-white"
                    title={full ? "Exit full screen" : "Full screen"}
                    aria-label={full ? "Exit full screen" : "Full screen"}
                  >
                    {full ? (
                      <Minimize2 className="h-5 w-5" strokeWidth={2} />
                    ) : (
                      <Maximize2 className="h-5 w-5" strokeWidth={2} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => clearThread()}
                    className="rounded-full p-2 text-[#8e8e93] hover:bg-white/[0.08] hover:text-white"
                    title="Clear this chat"
                    aria-label="Clear this chat"
                  >
                    <Eraser className="h-5 w-5" strokeWidth={2} />
                  </button>
                </header>

                <div
                  className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain bg-[#000000] px-2 py-2.5"
                  style={{
                    backgroundImage:
                      "linear-gradient(180deg, rgba(28,28,30,0.97) 0%, #000000 28%, #000000 100%)",
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="mr-auto flex max-w-[92%] gap-2">
                          <span className="mt-0.5 flex shrink-0 items-center justify-center" aria-hidden>
                            <CommandOrbIcon size="sm" />
                          </span>
                          <div className="rounded-[1.15rem] rounded-bl-md bg-[#2c2c2e] px-3.5 py-2.5 text-[15px] leading-[1.35] text-white shadow-sm">
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                            {msg.ts ? (
                              <p className="mt-1 text-[10px] text-[#636366]">
                                {new Date(msg.ts).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className="relative max-w-[78%]">
                          <div className="rounded-[1.15rem] rounded-br-md bg-[#0a84ff] px-3.5 py-2.5 text-[15px] leading-[1.35] text-white shadow-sm">
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                            {msg.ts ? (
                              <p className="mt-1 text-right text-[10px] text-white/70">
                                {new Date(msg.ts).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => beginEditUserMessage(msg.id)}
                            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#1c1c1e] text-[#e5e5ea] shadow-md ring-1 ring-white/20 transition hover:bg-[#2c2c2e]"
                            title="Edit and resend"
                            aria-label="Edit message"
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {sending ? (
                    <div className="flex justify-start pl-9">
                      <div className="flex gap-1 rounded-[1.15rem] rounded-bl-md bg-[#2c2c2e] px-4 py-3">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#8e8e93] [animation-delay:-0.2s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#8e8e93] [animation-delay:-0.1s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#8e8e93]" />
                      </div>
                    </div>
                  ) : null}
                  <div ref={endRef} />
                </div>

                <div className="shrink-0 border-t border-white/[0.08] bg-[#1c1c1e] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                  {memory.trim() ? (
                    <p className="mb-1.5 px-1 text-[10px] leading-snug text-[#8e8e93]">
                      Notes saved for this workspace — Relay uses them in replies. Say{" "}
                      <span className="font-medium text-[#e5e5ea]">remember …</span> to add more.
                    </p>
                  ) : (
                    <p className="mb-1.5 px-1 text-[10px] leading-snug text-[#8e8e93]">
                      Say <span className="font-medium text-[#e5e5ea]">remember …</span> to save facts for
                      future replies. Shift+Enter for a new line.
                    </p>
                  )}
                  <div className="flex items-end gap-2">
                    <div className="relative min-h-[44px] flex-1 rounded-[1.35rem] border border-white/[0.12] bg-[#2c2c2e] px-3 pt-2.5">
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void send();
                          }
                        }}
                        placeholder="Message"
                        rows={2}
                        className="max-h-36 min-h-[52px] w-full resize-none bg-transparent pb-2 text-[16px] leading-snug text-white placeholder:text-[#636366] focus:outline-none"
                        aria-label="Message"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void send()}
                      disabled={sending || !input.trim()}
                      className="mb-0.5 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full bg-[#0a84ff] text-white shadow-md transition hover:opacity-95 disabled:opacity-35"
                      aria-label="Send"
                    >
                      <Send className="h-5 w-5" strokeWidth={2} />
                    </button>
                  </div>
                  <div className="mt-2">
                    <p className="mb-1 px-1 text-[10px] text-[#636366]">
                      {input.trim()
                        ? "Ideas match your draft — tap to send"
                        : "Quick ideas — tap to send · type to filter"}
                    </p>
                    <div className="-mx-0.5 flex gap-1.5 overflow-x-auto pb-0.5 pt-0.5 [scrollbar-width:thin]">
                      {suggestionChips.map((s) => (
                        <button
                          key={`${s.label}-${s.learnMoreHref}`}
                          type="button"
                          onClick={() => void send(s.prompt)}
                          disabled={sending}
                          title={`${s.prompt}\nLearn more: ${s.learnMoreHref}`}
                          className="shrink-0 rounded-full border border-white/[0.12] bg-[#2c2c2e]/95 px-3 py-1.5 text-left text-[11px] leading-tight text-[#e5e5ea] transition hover:border-white/[0.22] hover:bg-[#3a3a3c] disabled:opacity-50"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px]">
                    <Link href="/projects" className="text-[#0a84ff] hover:underline">
                      Projects
                    </Link>
                    <Link href="/integrations" className="text-[#0a84ff] hover:underline">
                      Integrations
                    </Link>
                    <Link href="/docs/product" className="text-[#0a84ff] hover:underline">
                      Product help
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>,
    document.body
  );
}
