"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { nanoid } from "nanoid";
import type { CommitmentSource } from "@/lib/commitment-types";
import type { OrgCommitmentPriority } from "@/lib/org-commitment-types";
import { ORG_PRIORITY_LABEL, ORG_PRIORITY_PILL } from "@/lib/org-commitments/tracker-constants";
import { useBillingUpgrade } from "@/components/billing/BillingUpgradeProvider";
import type { UpgradePromptPayload } from "@/lib/billing/types";

type Phase = "input" | "processing" | "review" | "committing" | "success";

type CaptureCard = {
  key: string;
  title: string;
  ownerUserId: string | null;
  ownerNameHint: string | null;
  deadlineIso: string | null;
  priority: OrgCommitmentPriority;
  source: CommitmentSource;
  sourceSnippet: string;
};

const EXAMPLES: Record<string, string> = {
  meeting: `Q1 planning — Apr 2

Attendees: Sam, Jordan

- Sam to send revised pricing to Acme by Friday EOD.
- Jordan will schedule legal review for the template by Monday.
- @alex update the rollout deck with EU notes before next sync.`,
  slack: `Slack #growth — Today

Sarah: let's lock owners for launch tasks
Mike: I'll own the blog post, need it live by March 20
Sarah: Remind @jordan to wire the analytics event by Tuesday`,
  email: `Subject: Follow-ups from board prep

Hi team — quick commitments from the thread:

- Finance (Tom): publish Q3 summary to the board portal by March 25.
- Product (me): circulate the KPI dashboard link by Thursday noon.
- HR: confirm policy edits with counsel — due April 1.`,
};

function defaultDeadlineIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7);
  d.setUTCHours(17, 0, 0, 0);
  return d.toISOString();
}

function toYmd(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function fromYmd(ymd: string): string | null {
  if (!ymd.trim()) return null;
  return `${ymd}T17:00:00.000Z`;
}

function buildDescription(snippet: string, source: CommitmentSource): string | null {
  const q = snippet.trim();
  if (!q) return null;
  return `— Source (${source}) —\n${q}`;
}

const PRIORITIES: OrgCommitmentPriority[] = ["critical", "high", "medium", "low"];

function priorityUiLabel(p: OrgCommitmentPriority): string {
  if (p === "medium") return "Normal";
  return ORG_PRIORITY_LABEL[p];
}

export default function CapturePanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useUser();
  const selfId = user?.id ?? null;
  const { showUpgrade } = useBillingUpgrade();

  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState("");
  const [cards, setCards] = useState<CaptureCard[]>([]);
  const [processNote, setProcessNote] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [assignees, setAssignees] = useState<{ id: string; label: string }[]>([]);
  const [openOwnerKey, setOpenOwnerKey] = useState<string | null>(null);
  const [openDueKey, setOpenDueKey] = useState<string | null>(null);
  const [expandedSnippets, setExpandedSnippets] = useState<Record<string, boolean>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setPhase("input");
    setText("");
    setCards([]);
    setProcessNote(null);
    setCommitError(null);
    setSuccessCount(0);
    setOpenOwnerKey(null);
    setOpenDueKey(null);
    setExpandedSnippets({});
    if (selfId) {
      const me =
        user?.fullName?.trim() ||
        [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
        user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
        "You";
      setAssignees([{ id: selfId, label: me }]);
    }
    const t = window.requestAnimationFrame(() => textareaRef.current?.focus());
    return () => window.cancelAnimationFrame(t);
  }, [open, selfId, user]);

  useEffect(() => {
    if (!open || !selfId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/commitments?sort=updated_at&order=desc", {
          credentials: "same-origin",
        });
        const data = (await res.json().catch(() => ({}))) as {
          commitments?: { ownerId: string }[];
        };
        const ids = new Set<string>([selfId]);
        for (const r of data.commitments ?? []) {
          if (r.ownerId) ids.add(r.ownerId);
        }
        const selfLabel =
          user?.fullName?.trim() ||
          [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
          user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
          "You";
        const list = [...ids].map((id) => ({
          id,
          label: id === selfId ? selfLabel : `${id.slice(0, 12)}…`,
        }));
        if (!cancelled) setAssignees(list);
      } catch {
        if (!cancelled) {
          const me =
            user?.fullName?.trim() ||
            [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
            user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
            "You";
          setAssignees([{ id: selfId, label: me }]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, selfId, user]);

  const runProcess = useCallback(async () => {
    const raw = text.trim();
    if (!raw || phase === "processing") return;
    setPhase("processing");
    setProcessNote(null);
    const minDelay = new Promise((r) => window.setTimeout(r, 480));
    try {
      const [res] = await Promise.all([
        fetch("/api/capture/process", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: raw }),
        }),
        minDelay,
      ]);
      const data = (await res.json().catch(() => ({}))) as {
        commitments?: {
          title: string;
          ownerName: string | null;
          dueDateIso: string | null;
          priority: OrgCommitmentPriority;
          source: CommitmentSource;
          sourceSnippet: string;
        }[];
        mode?: string;
        error?: string;
      };
      if (!res.ok) {
        setPhase("input");
        setProcessNote(typeof data.error === "string" ? data.error : "Could not process capture.");
        return;
      }
      if (data.error && data.mode === "offline") {
        setProcessNote(data.error);
      }
      const list = data.commitments ?? [];
      if (list.length === 0) {
        setPhase("input");
        setProcessNote("No commitments found — try clearer action items or bullets.");
        return;
      }
      const mapped: CaptureCard[] = list.map((c) => ({
        key: nanoid(),
        title: c.title,
        ownerUserId: null,
        ownerNameHint: c.ownerName,
        deadlineIso: c.dueDateIso,
        priority: c.priority,
        source: c.source,
        sourceSnippet: c.sourceSnippet || c.title,
      }));
      setCards(mapped);
      setPhase("review");
    } catch {
      setPhase("input");
      setProcessNote("Something went wrong. Check your connection and try again.");
    }
  }, [text, phase, selfId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (phase === "processing" || phase === "committing") return;
        onClose();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && phase === "input") {
        const t = e.target as HTMLElement;
        if (t.closest("[data-capture-textarea]")) {
          e.preventDefault();
          void runProcess();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, phase, runProcess]);

  const removeCard = (key: string) => {
    setCards((c) => c.filter((x) => x.key !== key));
  };

  const updateCard = (key: string, patch: Partial<CaptureCard>) => {
    setCards((c) => c.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  };

  const needsOwnerCount = useMemo(
    () => cards.filter((c) => !c.ownerUserId?.trim()).length,
    [cards]
  );
  const needsDueCount = useMemo(() => cards.filter((c) => !c.deadlineIso).length, [cards]);

  const commitAll = useCallback(async () => {
    if (!selfId || cards.length === 0 || phase === "committing") return;
    setCommitError(null);
    setPhase("committing");
    const items = cards.map((c) => ({
      title: c.title.trim(),
      description: buildDescription(c.sourceSnippet, c.source),
      ownerId: (c.ownerUserId?.trim() || selfId) as string,
      deadline: c.deadlineIso ?? defaultDeadlineIso(),
      priority: c.priority,
    }));
    try {
      const res = await fetch("/api/commitments/batch", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        count?: number;
        upgrade?: UpgradePromptPayload;
      };
      if (res.status === 409 && data.upgrade) {
        setPhase("review");
        showUpgrade(data.upgrade);
        return;
      }
      if (!res.ok) {
        setPhase("review");
        setCommitError(data.error ?? "Could not save commitments.");
        return;
      }
      setSuccessCount(data.count ?? items.length);
      setPhase("success");
      window.setTimeout(() => {
        onClose();
      }, 1400);
    } catch {
      setPhase("review");
      setCommitError("Network error — try again.");
    }
  }, [cards, selfId, phase, onClose, showUpgrade]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close capture"
            className="fixed inset-0 z-[200] cursor-default bg-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => {
              if (phase === "processing" || phase === "committing") return;
              onClose();
            }}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Capture commitments"
            className="fixed inset-y-0 right-0 z-[210] flex w-full max-w-[400px] flex-col border-l border-r5-border-subtle bg-r5-surface-primary/95 shadow-[0_0_0_1px_rgba(255,255,255,0.04),-24px_0_48px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-r5-border-subtle/80 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-r5-accent/15 text-r5-accent">
                  <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
                </div>
                <div>
                  <p className="text-[15px] font-semibold tracking-tight text-r5-text-primary">
                    Capture
                  </p>
                  <p className="text-[11px] text-r5-text-secondary">
                    Paste reality → tracked commitments
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (phase === "processing" || phase === "committing") return;
                  onClose();
                }}
                className="rounded-full p-2 text-r5-text-secondary transition hover:bg-r5-surface-hover hover:text-r5-text-primary"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {phase === "input" || phase === "processing" ? (
                <div className="space-y-4">
                  <div
                    data-capture-textarea
                    className="relative rounded-2xl border border-r5-border-subtle bg-r5-surface-primary/80 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  >
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      disabled={phase === "processing"}
                      placeholder="Paste a meeting note, Slack message, email, or any text with decisions in it…"
                      rows={10}
                      className="min-h-[220px] w-full resize-y rounded-[14px] bg-transparent px-4 py-3.5 text-[15px] leading-relaxed text-r5-text-primary placeholder:text-r5-text-secondary/75 focus:outline-none focus:ring-2 focus:ring-r5-accent/25 disabled:opacity-60"
                    />
                    {phase === "processing" ? (
                      <div className="pointer-events-none absolute inset-x-4 bottom-3 h-0.5 overflow-hidden rounded-full bg-r5-border-subtle">
                        <motion.div
                          className="h-full bg-r5-accent"
                          initial={{ width: "12%" }}
                          animate={{ width: "100%" }}
                          transition={{
                            duration: 1.85,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["Meeting notes", "meeting"],
                        ["Slack thread", "slack"],
                        ["Email chain", "email"],
                      ] as const
                    ).map(([label, key]) => (
                      <button
                        key={key}
                        type="button"
                        disabled={phase === "processing"}
                        onClick={() => setText(EXAMPLES[key])}
                        className="rounded-full border border-r5-border-subtle bg-r5-surface-secondary/50 px-3 py-1.5 text-[12px] font-medium text-r5-text-secondary transition hover:border-r5-accent/35 hover:text-r5-text-primary disabled:opacity-50"
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-r5-text-secondary">
                    <kbd className="rounded border border-r5-border-subtle bg-r5-surface-primary/60 px-1.5 py-0.5 font-mono text-[10px]">
                      ⌘
                    </kbd>
                    <span className="mx-0.5">+</span>
                    <kbd className="rounded border border-r5-border-subtle bg-r5-surface-primary/60 px-1.5 py-0.5 font-mono text-[10px]">
                      Enter
                    </kbd>
                    <span className="ml-1.5">to process</span>
                  </p>

                  {processNote ? (
                    <p className="text-[13px] text-r5-status-at-risk">{processNote}</p>
                  ) : null}

                  <button
                    type="button"
                    disabled={phase === "processing" || !text.trim()}
                    onClick={() => void runProcess()}
                    className="w-full rounded-xl bg-r5-text-primary py-3 text-[14px] font-semibold text-r5-surface-primary shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {phase === "processing" ? "Processing…" : "Process text"}
                  </button>
                </div>
              ) : null}

              {phase === "review" || phase === "committing" || phase === "success" ? (
                <div className="space-y-5">
                  {phase === "success" ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-r5-status-completed/25 bg-r5-status-completed/10 px-4 py-4 text-center"
                    >
                      <p className="text-[15px] font-semibold text-r5-text-primary">
                        {successCount} commitment{successCount === 1 ? "" : "s"} are now tracked
                      </p>
                      <p className="mt-1 text-[12px] text-r5-text-secondary">
                        They appear in your Feed in real time.
                      </p>
                    </motion.div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[13px] text-r5-text-secondary">
                          <span className="font-semibold text-r5-text-primary">
                            {cards.length}
                          </span>{" "}
                          {cards.length === 1 ? "commitment" : "commitments"}
                          {needsOwnerCount > 0 ? (
                            <span className="text-r5-status-at-risk">
                              {" "}
                              · {needsOwnerCount} need{needsOwnerCount === 1 ? "s" : ""} owner
                            </span>
                          ) : null}
                          {needsDueCount > 0 ? (
                            <span className="text-r5-status-at-risk">
                              {" "}
                              · {needsDueCount} need{needsDueCount === 1 ? "s" : ""} deadline
                            </span>
                          ) : null}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                          {cards.map((c) => (
                            <motion.div
                              key={c.key}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: 24, transition: { duration: 0.22 } }}
                              className={`relative rounded-2xl border border-r5-border-subtle bg-r5-surface-primary/70 p-4 shadow-sm ${
                                !c.ownerUserId ? "ring-1 ring-r5-status-at-risk/20" : ""
                              } ${!c.deadlineIso ? "ring-1 ring-r5-status-at-risk/15" : ""}`}
                            >
                              <button
                                type="button"
                                onClick={() => removeCard(c.key)}
                                className="absolute right-3 top-3 rounded-lg p-1 text-r5-text-secondary transition hover:bg-r5-surface-hover hover:text-r5-text-primary"
                                aria-label="Remove"
                              >
                                <X className="h-4 w-4" strokeWidth={2} />
                              </button>

                              <label className="sr-only" htmlFor={`cap-title-${c.key}`}>
                                Title
                              </label>
                              <input
                                id={`cap-title-${c.key}`}
                                value={c.title}
                                onChange={(e) => updateCard(c.key, { title: e.target.value })}
                                disabled={phase === "committing"}
                                className="w-full border-0 bg-transparent pr-8 text-[15px] font-medium leading-snug text-r5-text-primary placeholder:text-r5-text-secondary focus:outline-none focus:ring-0"
                              />

                              <div className="mt-3 flex flex-wrap gap-2">
                                <div className="relative">
                                  <button
                                    type="button"
                                    disabled={phase === "committing"}
                                    onClick={() => {
                                      setOpenDueKey(null);
                                      setOpenOwnerKey((k) => (k === c.key ? null : c.key));
                                    }}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition ${
                                      c.ownerUserId
                                        ? "border-r5-border-subtle text-r5-text-primary"
                                        : "border-r5-status-at-risk/40 bg-r5-status-at-risk/10 text-r5-status-at-risk"
                                    }`}
                                  >
                                    <User className="h-3.5 w-3.5 opacity-80" aria-hidden />
                                    {c.ownerUserId
                                      ? assignees.find((a) => a.id === c.ownerUserId)?.label ??
                                        "Owner"
                                      : "Assign owner"}
                                  </button>
                                  {openOwnerKey === c.key ? (
                                    <div className="absolute left-0 top-full z-10 mt-1 max-h-48 min-w-[200px] overflow-y-auto rounded-xl border border-r5-border-subtle bg-r5-surface-primary/95 py-1 shadow-xl">
                                      {assignees.map((a) => (
                                        <button
                                          key={a.id}
                                          type="button"
                                          className="flex w-full px-3 py-2 text-left text-[13px] text-r5-text-primary hover:bg-r5-surface-hover"
                                          onClick={() => {
                                            updateCard(c.key, { ownerUserId: a.id });
                                            setOpenOwnerKey(null);
                                          }}
                                        >
                                          {a.label}
                                        </button>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>

                                <div className="relative">
                                  <button
                                    type="button"
                                    disabled={phase === "committing"}
                                    onClick={() => {
                                      setOpenOwnerKey(null);
                                      setOpenDueKey((k) => (k === c.key ? null : c.key));
                                    }}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition ${
                                      c.deadlineIso
                                        ? "border-r5-border-subtle text-r5-text-primary"
                                        : "border-r5-status-at-risk/35 bg-r5-status-at-risk/10 text-r5-status-at-risk"
                                    }`}
                                  >
                                    <Calendar className="h-3.5 w-3.5 opacity-80" aria-hidden />
                                    {c.deadlineIso
                                      ? new Date(c.deadlineIso).toLocaleDateString(undefined, {
                                          month: "short",
                                          day: "numeric",
                                        })
                                      : "Set deadline"}
                                  </button>
                                  {openDueKey === c.key ? (
                                    <div
                                      className="absolute left-0 top-full z-10 mt-1 rounded-xl border border-r5-border-subtle bg-r5-surface-primary/95 p-3 shadow-xl"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="date"
                                        value={toYmd(c.deadlineIso)}
                                        onChange={(e) => {
                                          const iso = fromYmd(e.target.value);
                                          updateCard(c.key, { deadlineIso: iso });
                                        }}
                                        className="rounded-lg border border-r5-border-subtle bg-r5-surface-primary px-2 py-1 text-[13px] text-r5-text-primary"
                                      />
                                      <button
                                        type="button"
                                        className="mt-2 w-full text-[12px] text-r5-text-secondary hover:text-r5-text-primary"
                                        onClick={() => setOpenDueKey(null)}
                                      >
                                        Done
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              {c.ownerNameHint ? (
                                <p className="mt-2 text-[11px] text-r5-text-secondary">
                                  Detected owner hint:{" "}
                                  <span className="text-r5-text-primary">{c.ownerNameHint}</span>
                                </p>
                              ) : null}

                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {PRIORITIES.map((p) => (
                                  <button
                                    key={p}
                                    type="button"
                                    disabled={phase === "committing"}
                                    onClick={() => updateCard(c.key, { priority: p })}
                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                                      c.priority === p
                                        ? ORG_PRIORITY_PILL[p]
                                        : "border-r5-border-subtle/80 text-r5-text-secondary hover:text-r5-text-primary"
                                    }`}
                                  >
                                    {priorityUiLabel(p)}
                                  </button>
                                ))}
                              </div>

                              <div className="mt-3 border-t border-r5-border-subtle/60 pt-3">
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between text-left text-[11px] font-semibold uppercase tracking-wide text-r5-text-secondary"
                                  onClick={() =>
                                    setExpandedSnippets((s) => ({
                                      ...s,
                                      [c.key]: !s[c.key],
                                    }))
                                  }
                                >
                                  Source snippet
                                  {expandedSnippets[c.key] ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <AnimatePresence initial={false}>
                                  {expandedSnippets[c.key] ? (
                                    <motion.p
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="mt-2 overflow-hidden text-[12px] leading-relaxed text-r5-text-secondary"
                                    >
                                      {c.sourceSnippet}
                                    </motion.p>
                                  ) : (
                                    <p className="mt-2 line-clamp-2 text-[12px] text-r5-text-secondary">
                                      {c.sourceSnippet}
                                    </p>
                                  )}
                                </AnimatePresence>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>

                      {commitError ? (
                        <p className="text-[13px] text-r5-status-overdue">{commitError}</p>
                      ) : null}

                      <button
                        type="button"
                        disabled={phase === "committing" || cards.length === 0}
                        onClick={() => void commitAll()}
                        className="w-full rounded-xl bg-r5-text-primary py-3.5 text-[15px] font-semibold text-r5-surface-primary shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {phase === "committing"
                          ? "Committing…"
                          : `Commit ${cards.length} commitment${cards.length === 1 ? "" : "s"}`}
                      </button>

                      <button
                        type="button"
                        disabled={phase === "committing"}
                        onClick={() => {
                          setPhase("input");
                          setCards([]);
                        }}
                        className="w-full py-2 text-[13px] font-medium text-r5-text-secondary hover:text-r5-text-primary"
                      >
                        Back to paste
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
