"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock3,
  ListChecks,
  Paperclip,
  User,
  X,
} from "lucide-react";
import { nanoid } from "nanoid";
import type { CommitmentSource } from "@/lib/commitment-types";
import type { OrgCommitmentPriority } from "@/lib/org-commitment-types";
import { ORG_PRIORITY_LABEL, ORG_PRIORITY_PILL } from "@/lib/org-commitments/tracker-constants";
import { useBillingUpgrade } from "@/components/billing/BillingUpgradeProvider";
import type { UpgradePromptPayload } from "@/lib/billing/types";
import { NativeDateInput } from "@/components/ui/native-datetime-fields";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";

type Phase = "input" | "processing" | "review" | "committing" | "success";

type CaptureCard = {
  key: string;
  title: string;
  ownerUserId: string | null;
  /** True when we filled owner with you because extraction left it blank */
  ownerDefaulted?: boolean;
  ownerNameHint: string | null;
  projectId: string | null;
  deadlineIso: string | null;
  /** True when we set a default due date (e.g. one week) because none was found */
  deadlineDefaulted?: boolean;
  deadlineOriginalPhrase: string | null;
  priority: OrgCommitmentPriority;
  source: CommitmentSource;
  sourceSnippet: string;
  confidence: "high" | "medium" | "low";
  isImplied: boolean;
  impliedReason: string | null;
};

type CaptureHistoryItem = {
  id: string;
  text: string;
  commitmentCount: number;
  createdAtIso: string;
  completedCount: number;
};

type ProjectOption = {
  id: string;
  name: string;
};

const CAPTURE_HISTORY_KEY = "route5:capture-history-v1";
const MAX_CAPTURE_HISTORY = 10;
const MAX_CAPTURE_CHARS = 100_000;
const CAPTURE_BATCH_SIZE = 25;

function captureDraftKey(userId: string | null): string {
  return `route5:capture-draft-v1:${userId ?? "anon"}`;
}

function loadCaptureDraft(userId: string | null): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(captureDraftKey(userId)) ?? "";
  } catch {
    return "";
  }
}

function saveCaptureDraft(userId: string | null, text: string): void {
  if (typeof window === "undefined") return;
  try {
    if (!text.trim()) {
      localStorage.removeItem(captureDraftKey(userId));
      return;
    }
    localStorage.setItem(captureDraftKey(userId), text.slice(0, MAX_CAPTURE_CHARS));
  } catch {
    /* ignore */
  }
}

/** Apple Reminders–style default when the model finds no date: one week out, 5pm local */
function getDefaultCaptureDeadlineIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
}

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

const TEMPLATE_EXAMPLES: Record<string, { label: string; text: string }> = {
  product_launch: {
    label: "Product Launch",
    text: `Launch readiness
- Product team will finalize release notes by Friday.
- Marketing will publish launch email and social copy by Thursday EOD.
- Support will prepare customer FAQ update by Monday morning.`,
  },
  client_onboarding: {
    label: "Client Onboarding",
    text: `New client onboarding
- CSM will schedule kickoff and onboarding checklist review by Tuesday.
- Solutions engineer will configure integrations before end of week.
- Finance will send invoicing setup details by tomorrow.`,
  },
  weekly_sprint: {
    label: "Weekly Sprint",
    text: `Sprint commitments
- Engineering lead will lock sprint scope by Monday.
- QA owner will complete regression checks by Thursday.
- PM will share sprint review summary by Friday.`,
  },
  hiring_process: {
    label: "Hiring Process",
    text: `Hiring loop
- Recruiter will schedule panel interviews by Wednesday.
- Hiring manager will submit scorecard feedback same day.
- Ops will prepare offer packet by end of week.`,
  },
  sales_deal: {
    label: "Sales Deal",
    text: `Deal progression
- AE will send revised proposal by tomorrow.
- Solutions consultant will complete security questionnaire by Thursday.
- Legal owner will return redlines by next Monday.`,
  },
  board_meeting_prep: {
    label: "Board Meeting Prep",
    text: `Board prep
- CEO will draft meeting narrative by next Friday.
- Finance lead will finalize KPI and cash runway numbers by Wednesday.
- Chief of staff will distribute pre-read packet by Monday morning.`,
  },
};

function detectCaptureFormat(text: string): "Meeting notes" | "Email thread" | "Slack conversation" | "Document" {
  const t = text.toLowerCase();
  if (!t.trim()) return "Document";
  if (t.includes("subject:") || (t.includes("from:") && t.includes("to:"))) return "Email thread";
  if (t.includes("#") || t.includes("@") || t.includes("slack") || t.includes("thread")) {
    return "Slack conversation";
  }
  if (t.includes("attendees:") || t.includes("agenda") || t.includes("meeting")) return "Meeting notes";
  return "Document";
}

function estimateCommitmentCount(text: string): number {
  if (!text.trim()) return 0;
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const sentenceLike = text
    .replace(/\r/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const regexes = [
    /^[-*•]\s+/,
    /\b[A-Z][a-z]+\s+(will|needs to|must|has to|committed to|said (he|she) would)\b/,
    /\b(todo|action item|follow up)\b/i,
  ];
  const buckets = new Set<string>();
  for (const line of [...lines, ...sentenceLike]) {
    if (regexes.some((re) => re.test(line))) buckets.add(line.toLowerCase().slice(0, 180));
  }
  return buckets.size;
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

function loadCaptureHistory(): CaptureHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CAPTURE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CaptureHistoryItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x.text === "string")
      .slice(0, MAX_CAPTURE_HISTORY);
  } catch {
    return [];
  }
}

function saveCaptureHistory(items: CaptureHistoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CAPTURE_HISTORY_KEY, JSON.stringify(items.slice(0, MAX_CAPTURE_HISTORY)));
  } catch {
    /* ignore */
  }
}

function capturePreview(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 140 ? `${oneLine.slice(0, 140)}…` : oneLine;
}

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
  const { prefs, pushToast } = useWorkspaceExperience();

  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState("");
  const [cards, setCards] = useState<CaptureCard[]>([]);
  const [processNote, setProcessNote] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [assignees, setAssignees] = useState<{ id: string; label: string; imageUrl: string | null }[]>(
    []
  );
  const [openOwnerKey, setOpenOwnerKey] = useState<string | null>(null);
  const [openDueKey, setOpenDueKey] = useState<string | null>(null);
  const [expandedSnippets, setExpandedSnippets] = useState<Record<string, boolean>>({});
  const [pastePulse, setPastePulse] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [captureHistory, setCaptureHistory] = useState<CaptureHistoryItem[]>([]);
  const [scanCount, setScanCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedCardKeys, setSelectedCardKeys] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("");
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /** Prevents double-submit before React re-renders (rapid clicks / double-tap). */
  const processingRef = useRef(false);
  const committingRef = useRef(false);

  /* Intentionally depend only on `open`: this resets the panel when it opens; adding user
   * fields would re-trigger on Clerk profile refresh and could wipe in-progress capture. */
  useEffect(() => {
    if (!open) return;
    setPhase("input");
    setText(loadCaptureDraft(selfId));
    setCards([]);
    setProcessNote(null);
    setCommitError(null);
    setSuccessCount(0);
    setOpenOwnerKey(null);
    setOpenDueKey(null);
    setExpandedSnippets({});
    setPastePulse(false);
    setFileBusy(false);
    setScanCount(0);
    setIsScanning(false);
    setCaptureHistory(loadCaptureHistory());
    setProjects([]);
    setSelectedCardKeys([]);
    setShowRecent(false);
    setSelectedTemplateKey("");
    processingRef.current = false;
    committingRef.current = false;
    if (selfId) {
      const me =
        user?.fullName?.trim() ||
        [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
        user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
        "You";
      setAssignees([{ id: selfId, label: me, imageUrl: user?.imageUrl ?? null }]);
    }
    const t = window.requestAnimationFrame(() => textareaRef.current?.focus());
    return () => window.cancelAnimationFrame(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
  }, [open]);

  useEffect(() => {
    if (!open) return;
    saveCaptureDraft(selfId, text);
  }, [open, selfId, text]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileViewport(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/projects", { credentials: "same-origin" });
        const data = (await res.json().catch(() => ({}))) as {
          projects?: { id: string; name: string }[];
        };
        if (!res.ok || cancelled) return;
        setProjects((data.projects ?? []).map((p) => ({ id: p.id, name: p.name })));
      } catch {
        if (!cancelled) setProjects([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || phase !== "input") return;
    if (!text.trim()) {
      setScanCount(0);
      setIsScanning(false);
      return;
    }
    setIsScanning(true);
    const id = window.setTimeout(() => {
      setScanCount(estimateCommitmentCount(text));
      setIsScanning(false);
    }, 220);
    return () => window.clearTimeout(id);
  }, [open, phase, text]);

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

        type Collab = {
          userId: string;
          firstName: string | null;
          lastName: string | null;
          username: string | null;
          imageUrl: string | null;
          primaryEmail: string | null;
        };
        let byId = new Map<string, Collab>();
        try {
          const cr = await fetch("/api/workspace/collaborators", { credentials: "same-origin" });
          const cj = (await cr.json().catch(() => ({}))) as { collaborators?: Collab[] };
          if (cr.ok && cj.collaborators) {
            byId = new Map(cj.collaborators.map((c) => [c.userId, c]));
          }
        } catch {
          /* ignore */
        }

        const list = [...ids].map((id) => {
          const row = byId.get(id);
          const label =
            id === selfId
              ? selfLabel
              : row
                ? [row.firstName, row.lastName].filter(Boolean).join(" ").trim() ||
                  (row.username ? `@${row.username}` : null) ||
                  row.primaryEmail?.split("@")[0] ||
                  `${id.slice(0, 10)}…`
                : `${id.slice(0, 12)}…`;
          return {
            id,
            label,
            imageUrl: id === selfId ? user?.imageUrl ?? row?.imageUrl ?? null : row?.imageUrl ?? null,
          };
        });
        if (!cancelled) setAssignees(list);
      } catch {
        if (!cancelled) {
          const me =
            user?.fullName?.trim() ||
            [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
            user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
            "You";
          setAssignees([{ id: selfId, label: me, imageUrl: user?.imageUrl ?? null }]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, selfId, user]);

  const runProcess = useCallback(async () => {
    const raw = text.trim();
    if (!raw || phase === "processing" || processingRef.current) return;
    processingRef.current = true;
    setPhase("processing");
    setProcessNote(null);
    const minDelay = new Promise((r) => window.setTimeout(r, 480));
    try {
      const [res] = await Promise.all([
        fetch("/api/capture/process", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: raw,
            extractionProviderId: prefs.extractionProviderId ?? "auto",
          }),
        }),
        minDelay,
      ]);
      const data = (await res.json().catch(() => ({}))) as {
        commitments?: {
          title: string;
          ownerName: string | null;
          ownerUserId?: string | null;
          dueDateIso: string | null;
          deadlineOriginalPhrase?: string | null;
          priority: OrgCommitmentPriority;
          source: CommitmentSource;
          sourceSnippet: string;
          confidence?: "high" | "medium" | "low";
          isImplied?: boolean;
          impliedReason?: string | null;
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
      const mapped: CaptureCard[] = list.map((c) => {
        const extractedOwner = c.ownerUserId?.trim() || null;
        const extractedDue = c.dueDateIso?.trim() ? c.dueDateIso : null;
        return {
          key: nanoid(),
          title: c.title,
          ownerUserId: extractedOwner || selfId || null,
          ownerDefaulted: !extractedOwner && Boolean(selfId),
          ownerNameHint: c.ownerName,
          projectId: null,
          deadlineIso: extractedDue || getDefaultCaptureDeadlineIso(),
          deadlineDefaulted: !extractedDue,
          deadlineOriginalPhrase: c.deadlineOriginalPhrase ?? null,
          priority: c.priority,
          source: c.source,
          sourceSnippet: c.sourceSnippet || c.title,
          confidence: c.confidence ?? "medium",
          isImplied: Boolean(c.isImplied),
          impliedReason: c.impliedReason ?? null,
        };
      });

      setCards([]);
      setPhase("review");
      mapped.forEach((card, i) => {
        window.setTimeout(() => {
          setCards((prev) => [...prev, card]);
        }, i * 80);
      });

      const nextHistory: CaptureHistoryItem[] = [
        {
          id: nanoid(),
          text: raw,
          commitmentCount: mapped.length,
          createdAtIso: new Date().toISOString(),
          completedCount: 0,
        },
        ...captureHistory,
      ].slice(0, MAX_CAPTURE_HISTORY);
      setCaptureHistory(nextHistory);
      saveCaptureHistory(nextHistory);
    } catch {
      setPhase("input");
      setProcessNote("Something went wrong. Check your connection and try again.");
    } finally {
      processingRef.current = false;
    }
  }, [text, phase, prefs.extractionProviderId, captureHistory, selfId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (phase === "processing" || phase === "committing") return;
        onClose();
        return;
      }
      if (!isMobileViewport && (e.metaKey || e.ctrlKey) && e.key === "Enter" && phase === "input") {
        const t = e.target as HTMLElement;
        if (t.closest("[data-capture-textarea]")) {
          e.preventDefault();
          void runProcess();
        }
      }
      if (!isMobileViewport && (e.metaKey || e.ctrlKey) && e.key === "Enter" && phase === "review") {
        e.preventDefault();
        document.querySelector<HTMLButtonElement>("[data-capture-commit='true']")?.click();
      }
      if (e.key === "Tab" && phase === "review") {
        const emptyTargets = Array.from(
          document.querySelectorAll<HTMLElement>("[data-capture-empty='true']")
        );
        if (emptyTargets.length === 0) return;
        const active = document.activeElement as HTMLElement | null;
        if (!active || !emptyTargets.includes(active)) {
          e.preventDefault();
          emptyTargets[0]?.focus();
          return;
        }
        e.preventDefault();
        const idx = emptyTargets.indexOf(active);
        const nextIndex = e.shiftKey
          ? (idx - 1 + emptyTargets.length) % emptyTargets.length
          : (idx + 1) % emptyTargets.length;
        emptyTargets[nextIndex]?.focus();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && phase === "review") {
        const active = document.activeElement as HTMLElement | null;
        const key = active?.closest<HTMLElement>("[data-card-key]")?.dataset.cardKey;
        if (key) {
          e.preventDefault();
          removeCard(key);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, phase, runProcess, isMobileViewport]);

  const removeCard = (key: string) => {
    setCards((c) => c.filter((x) => x.key !== key));
    setSelectedCardKeys((prev) => prev.filter((k) => k !== key));
  };

  const updateCard = (key: string, patch: Partial<CaptureCard>) => {
    setCards((c) =>
      c.map((x) => {
        if (x.key !== key) return x;
        const next = { ...x, ...patch };
        if (patch.ownerUserId != null) next.ownerDefaulted = false;
        if (patch.deadlineIso != null) next.deadlineDefaulted = false;
        return next;
      })
    );
  };

  const defaultOwnerCount = useMemo(
    () => cards.filter((c) => c.ownerDefaulted).length,
    [cards]
  );
  const defaultDueCount = useMemo(() => cards.filter((c) => c.deadlineDefaulted).length, [cards]);
  const readyCount = cards.length;
  const impliedCount = useMemo(
    () => cards.filter((c) => c.isImplied).length,
    [cards]
  );
  const charCount = text.length;
  const detectedFormat = useMemo(() => detectCaptureFormat(text), [text]);

  const triggerPastePulse = useCallback(() => {
    setPastePulse(true);
    window.setTimeout(() => setPastePulse(false), 320);
  }, []);

  const importFileText = useCallback(async (file: File) => {
    setFileBusy(true);
    setProcessNote(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/capture/file-text", {
        method: "POST",
        credentials: "same-origin",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        setProcessNote(data.error ?? "Could not import this file.");
        return;
      }
      setText((prev) => {
        const prefix = prev.trim() ? `${prev}\n\n` : "";
        return `${prefix}${data.text}`.slice(0, MAX_CAPTURE_CHARS);
      });
      triggerPastePulse();
      pushToast(`Imported ${file.name}`, "success");
    } catch {
      setProcessNote("Could not import this file.");
    } finally {
      setFileBusy(false);
    }
  }, [pushToast, triggerPastePulse]);

  const commitAll = useCallback(async () => {
    if (!selfId || cards.length === 0 || phase === "committing" || committingRef.current) return;
    committingRef.current = true;
    setCommitError(null);
    setPhase("committing");
    const items = cards.map((c) => ({
      title: c.title.trim(),
      description: buildDescription(c.sourceSnippet, c.source),
      ownerId: (c.ownerUserId?.trim() || selfId).trim(),
      projectId: c.projectId ?? null,
      deadline: c.deadlineIso?.trim() ? c.deadlineIso : getDefaultCaptureDeadlineIso(),
      priority: c.priority,
    }));
    try {
      let committed = 0;
      for (let i = 0; i < items.length; i += CAPTURE_BATCH_SIZE) {
        const chunk = items.slice(i, i + CAPTURE_BATCH_SIZE);
        const res = await fetch("/api/commitments/batch", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: chunk }),
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
        committed += data.count ?? chunk.length;
      }

      setSuccessCount(committed);
      setCaptureHistory((prev) => {
        if (prev.length === 0) return prev;
        const [first, ...rest] = prev;
        const next = [
          {
            ...first,
            completedCount: committed,
          },
          ...rest,
        ];
        saveCaptureHistory(next);
        return next;
      });
      saveCaptureDraft(selfId, "");
      setPhase("success");
      window.dispatchEvent(new Event("route5:commitments-changed"));
      window.setTimeout(() => {
        onClose();
      }, 1400);
    } catch {
      setPhase("review");
      setCommitError("Network error — try again.");
    } finally {
      committingRef.current = false;
    }
  }, [cards, selfId, phase, onClose, showUpgrade]);

  const selectedSet = useMemo(() => new Set(selectedCardKeys), [selectedCardKeys]);
  const selectedCount = selectedCardKeys.length;

  const applyBulkToSelected = useCallback(
    (patch: Partial<CaptureCard>) => {
      if (selectedCardKeys.length === 0) return;
      setCards((prev) =>
        prev.map((card) => {
          if (!selectedSet.has(card.key)) return card;
          const next = { ...card, ...patch };
          if (patch.ownerUserId != null) next.ownerDefaulted = false;
          if (patch.deadlineIso != null) next.deadlineDefaulted = false;
          return next;
        })
      );
    },
    [selectedCardKeys.length, selectedSet]
  );

  const quickDueIso = useCallback(
    (kind: "today" | "tomorrow" | "this_friday" | "next_week" | "end_of_month") => {
      const d = new Date();
      if (kind === "tomorrow") d.setDate(d.getDate() + 1);
      if (kind === "this_friday") {
        const current = d.getDay();
        const toFriday = (5 - current + 7) % 7;
        d.setDate(d.getDate() + toFriday);
      }
      if (kind === "next_week") d.setDate(d.getDate() + 7);
      if (kind === "end_of_month") {
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 17, 0, 0, 0)).toISOString();
      }
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 17, 0, 0, 0)).toISOString();
    },
    []
  );

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
            className="fixed inset-0 z-[210] flex w-full max-w-none flex-col border-r5-border-subtle bg-r5-surface-primary/95 shadow-[0_0_0_1px_rgba(255,255,255,0.04),-24px_0_48px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl md:inset-y-0 md:right-0 md:max-w-[400px] md:border-l"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-r5-border-subtle/80 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-r5-accent/15 text-r5-accent">
                  <ListChecks className="h-4 w-4" strokeWidth={2} aria-hidden />
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
            {isMobileViewport ? (
              <div className="border-b border-r5-border-subtle/70 bg-r5-surface-secondary/40 px-5 py-2.5">
                <p className="text-[11px] text-r5-text-secondary">
                  For the best capture experience, use Route5 on desktop.
                </p>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              {phase === "input" || phase === "processing" ? (
                <div className="space-y-4">
                  <div
                    data-capture-textarea
                    className={`relative rounded-2xl border border-r5-border-subtle bg-r5-surface-primary/80 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition ${
                      pastePulse ? "ring-2 ring-r5-accent/35" : ""
                    }`}
                  >
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onPaste={() => triggerPastePulse()}
                      disabled={phase === "processing"}
                      placeholder="Paste meeting notes, a Slack thread, an email chain, or any text containing decisions..."
                      rows={10}
                      maxLength={MAX_CAPTURE_CHARS}
                      className="min-h-[220px] w-full resize-y rounded-[14px] bg-transparent px-4 py-3.5 text-[15px] leading-relaxed text-r5-text-primary placeholder:text-r5-text-secondary/75 focus:outline-none focus:ring-2 focus:ring-r5-accent/25 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setText("");
                        saveCaptureDraft(selfId, "");
                        setCards([]);
                        setSelectedCardKeys([]);
                        setProcessNote(null);
                        setOpenDueKey(null);
                        setOpenOwnerKey(null);
                      }}
                      disabled={!text.length || phase === "processing"}
                      className="absolute right-3 top-3 rounded-full border border-r5-border-subtle bg-r5-surface-primary/70 p-1.5 text-r5-text-secondary transition hover:bg-r5-surface-hover hover:text-r5-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Clear"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
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
                  {text.trim() ? (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="rounded-full border border-r5-border-subtle bg-r5-surface-secondary/40 px-2 py-0.5 text-r5-text-primary">
                        {detectedFormat}
                      </span>
                      <span className="text-r5-text-secondary">
                        {isScanning ? "Scanning..." : "Scanning complete"} {scanCount} commitment
                        {scanCount === 1 ? "" : "s"} detected
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between text-[11px] text-r5-text-secondary">
                    <span>{charCount.toLocaleString()} / {MAX_CAPTURE_CHARS.toLocaleString()} characters</span>
                    <span>{isMobileViewport ? "Use Process text button" : "Cmd+Enter to process"}</span>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
                    {(
                      [
                        ["Weekly team sync", "meeting"],
                        ["Client call recap", "slack"],
                        ["Email chain", "email"],
                      ] as const
                    ).map(([label, key]) => (
                      <button
                        key={key}
                        type="button"
                        disabled={phase === "processing"}
                        onClick={() => setText(EXAMPLES[key])}
                        className="min-h-11 shrink-0 rounded-full border border-r5-border-subtle bg-r5-surface-secondary/50 px-3 py-1.5 text-[12px] font-medium text-r5-text-secondary transition hover:border-r5-accent/35 hover:text-r5-text-primary disabled:opacity-50"
                      >
                        {label}
                      </button>
                    ))}
                    <label className="min-h-11 shrink-0 rounded-full border border-r5-border-subtle bg-r5-surface-secondary/50 px-3 py-1.5 text-[12px] font-medium text-r5-text-secondary transition hover:border-r5-accent/35 hover:text-r5-text-primary">
                      <span className="inline-flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5" />
                        {fileBusy ? "Importing…" : "Import file"}
                      </span>
                      <input
                        type="file"
                        className="sr-only"
                        disabled={fileBusy || phase === "processing"}
                        accept=".pdf,.txt,.md,.eml,.csv,.json,text/plain,text/markdown,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void importFileText(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <select
                      value={selectedTemplateKey}
                      onChange={(e) => {
                        const key = e.target.value;
                        setSelectedTemplateKey(key);
                        if (!key) return;
                        const template = TEMPLATE_EXAMPLES[key];
                        if (template) setText(template.text);
                      }}
                      className="min-h-11 shrink-0 rounded-full border border-r5-border-subtle bg-r5-surface-secondary/50 px-3 py-1.5 text-[12px] font-medium text-r5-text-secondary transition hover:border-r5-accent/35 hover:text-r5-text-primary"
                    >
                      <option value="">Templates</option>
                      {Object.entries(TEMPLATE_EXAMPLES).map(([key, template]) => (
                        <option key={key} value={key}>
                          {template.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!isMobileViewport ? (
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
                  ) : null}

                  {processNote ? (
                    <p className="rounded-lg border border-r5-status-at-risk/35 bg-r5-status-at-risk/10 px-3 py-2 text-[13px] text-r5-text-primary">
                      {processNote}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    disabled={phase === "processing" || !text.trim()}
                    onClick={() => void runProcess()}
                    className="w-full rounded-xl bg-r5-text-primary py-3 text-[14px] font-semibold text-r5-surface-primary shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {phase === "processing" ? "Processing…" : "Process text"}
                  </button>

                  {captureHistory.length > 0 ? (
                    <div className="rounded-xl border border-r5-border-subtle/70 bg-r5-surface-secondary/35 p-2">
                      <button
                        type="button"
                        onClick={() => setShowRecent((s) => !s)}
                        className="flex w-full items-center justify-between px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-r5-text-secondary"
                      >
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          Recent
                        </span>
                        {showRecent ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      {showRecent ? (
                        <div className="max-h-40 space-y-1 overflow-y-auto">
                          {captureHistory.slice(0, 8).map((h) => (
                            <button
                              key={h.id}
                              type="button"
                              onClick={() => setText(h.text)}
                              className="w-full rounded-lg px-2 py-2 text-left transition hover:bg-r5-surface-hover/60"
                            >
                              <p className="line-clamp-1 text-[12px] font-medium text-r5-text-primary">{capturePreview(h.text)}</p>
                              <p className="mt-0.5 text-[11px] text-r5-text-secondary">
                                {h.commitmentCount} commitments · {new Date(h.createdAtIso).toLocaleString()} · {h.completedCount} committed
                              </p>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
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
                        They appear on your Desk in real time.
                      </p>
                    </motion.div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="inline-flex flex-wrap items-center gap-2 rounded-full border border-r5-border-subtle bg-r5-surface-secondary/45 px-3 py-1 text-[12px] text-r5-text-primary">
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-r5-status-completed" aria-hidden />
                            {readyCount} to save
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-r5-status-at-risk" aria-hidden />
                            {defaultOwnerCount} owner default
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-r5-status-at-risk" aria-hidden />
                            {defaultDueCount} due default
                          </span>
                          <span className="inline-flex items-center gap-1 text-r5-text-secondary">
                            {impliedCount} implied
                          </span>
                        </p>
                      </div>

                      <div className="space-y-3">
                        {cards.length > 1 ? (
                          <div className="rounded-xl border border-r5-border-subtle bg-r5-surface-secondary/35 p-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-md border border-r5-border-subtle px-2 py-1 text-[11px] text-r5-text-primary hover:bg-r5-surface-hover"
                                onClick={() =>
                                  setSelectedCardKeys(
                                    selectedCardKeys.length === cards.length ? [] : cards.map((card) => card.key)
                                  )
                                }
                              >
                                <CheckSquare className="h-3.5 w-3.5" />
                                {selectedCardKeys.length === cards.length ? "Unselect all" : "Select all"}
                              </button>
                              <span className="text-[11px] text-r5-text-secondary">{selectedCount} selected</span>
                              <select
                                className="rounded-md border border-r5-border-subtle bg-r5-surface-primary px-2 py-1 text-[11px] text-r5-text-primary"
                                defaultValue=""
                                onChange={(e) => {
                                  if (!e.target.value) return;
                                  applyBulkToSelected({ ownerUserId: e.target.value });
                                  e.currentTarget.value = "";
                                }}
                              >
                                <option value="">Bulk owner</option>
                                {assignees.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.label}
                                  </option>
                                ))}
                              </select>
                              <select
                                className="rounded-md border border-r5-border-subtle bg-r5-surface-primary px-2 py-1 text-[11px] text-r5-text-primary"
                                defaultValue=""
                                onChange={(e) => {
                                  const value = e.target.value as
                                    | ""
                                    | "today"
                                    | "tomorrow"
                                    | "this_friday"
                                    | "next_week"
                                    | "end_of_month";
                                  if (!value) return;
                                  applyBulkToSelected({ deadlineIso: quickDueIso(value) });
                                  e.currentTarget.value = "";
                                }}
                              >
                                <option value="">Bulk deadline</option>
                                <option value="today">Today</option>
                                <option value="tomorrow">Tomorrow</option>
                                <option value="this_friday">This Friday</option>
                                <option value="next_week">Next Week</option>
                                <option value="end_of_month">End of Month</option>
                              </select>
                              <select
                                className="rounded-md border border-r5-border-subtle bg-r5-surface-primary px-2 py-1 text-[11px] text-r5-text-primary"
                                defaultValue=""
                                onChange={(e) => {
                                  const value = e.target.value as "" | OrgCommitmentPriority;
                                  if (!value) return;
                                  applyBulkToSelected({ priority: value });
                                  e.currentTarget.value = "";
                                }}
                              >
                                <option value="">Bulk priority</option>
                                {PRIORITIES.map((p) => (
                                  <option key={p} value={p}>
                                    {priorityUiLabel(p)}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="rounded-md border border-r5-status-overdue/40 bg-r5-status-overdue/10 px-2 py-1 text-[11px] text-r5-text-primary hover:bg-r5-status-overdue/15"
                                onClick={() => {
                                  if (selectedCardKeys.length === 0) return;
                                  setCards((prev) => prev.filter((card) => !selectedSet.has(card.key)));
                                  setSelectedCardKeys([]);
                                }}
                              >
                                Dismiss selected
                              </button>
                            </div>
                          </div>
                        ) : null}
                        <AnimatePresence mode="popLayout">
                          {cards.map((c) => (
                            <motion.div
                              key={c.key}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: 24, transition: { duration: 0.22 } }}
                              data-card-key={c.key}
                              tabIndex={-1}
                              className={`relative rounded-2xl border border-r5-border-subtle bg-r5-surface-primary/70 p-4 shadow-sm ${
                                c.ownerDefaulted ? "ring-1 ring-r5-status-at-risk/20" : ""
                              } ${c.deadlineDefaulted ? "ring-1 ring-r5-status-at-risk/15" : ""}`}
                            >
                              <label className="absolute left-3 top-3 inline-flex items-center">
                                <input
                                  type="checkbox"
                                  checked={selectedSet.has(c.key)}
                                  onChange={(e) => {
                                    setSelectedCardKeys((prev) =>
                                      e.target.checked ? [...new Set([...prev, c.key])] : prev.filter((k) => k !== c.key)
                                    );
                                  }}
                                  className="h-3.5 w-3.5 rounded border-r5-border-subtle bg-r5-surface-secondary"
                                  aria-label="Select card"
                                />
                              </label>
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
                                className="w-full border-0 bg-transparent pl-5 pr-8 text-[15px] font-medium leading-snug text-r5-text-primary placeholder:text-r5-text-secondary focus:outline-none focus:ring-0"
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
                                    data-capture-empty={c.ownerDefaulted ? "true" : "false"}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition ${
                                      !c.ownerDefaulted
                                        ? "border-r5-border-subtle text-r5-text-primary"
                                        : "border-r5-status-at-risk/45 bg-r5-status-at-risk/10 text-r5-text-primary"
                                    }`}
                                  >
                                    {c.ownerUserId ? (
                                      (() => {
                                        const a = assignees.find((x) => x.id === c.ownerUserId);
                                        return a?.imageUrl ? (
                                          <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
                                            <Image
                                              src={a.imageUrl}
                                              alt=""
                                              width={20}
                                              height={20}
                                              className="object-cover"
                                            />
                                          </span>
                                        ) : (
                                          <User className="h-3.5 w-3.5 opacity-80" aria-hidden />
                                        );
                                      })()
                                    ) : (
                                      <User className="h-3.5 w-3.5 opacity-80" aria-hidden />
                                    )}
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
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-r5-text-primary hover:bg-r5-surface-hover"
                                          onClick={() => {
                                            updateCard(c.key, { ownerUserId: a.id });
                                            setOpenOwnerKey(null);
                                          }}
                                        >
                                          {a.imageUrl ? (
                                            <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
                                              <Image
                                                src={a.imageUrl}
                                                alt=""
                                                width={24}
                                                height={24}
                                                className="object-cover"
                                              />
                                            </span>
                                          ) : (
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-r5-surface-secondary text-[10px] font-semibold text-r5-text-secondary">
                                              {a.label.slice(0, 2).toUpperCase()}
                                            </span>
                                          )}
                                          <span className="min-w-0 truncate">{a.label}</span>
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
                                    data-capture-empty={c.deadlineDefaulted ? "true" : "false"}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition ${
                                      !c.deadlineDefaulted
                                        ? "border-r5-border-subtle text-r5-text-primary"
                                        : "border-r5-status-at-risk/45 bg-r5-status-at-risk/10 text-r5-text-primary"
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
                                      <div className="mb-2 grid grid-cols-2 gap-1">
                                        {(
                                          [
                                            ["Today", "today"],
                                            ["Tomorrow", "tomorrow"],
                                            ["This Friday", "this_friday"],
                                            ["Next Week", "next_week"],
                                            ["End of Month", "end_of_month"],
                                          ] as const
                                        ).map(([label, key]) => (
                                          <button
                                            key={key}
                                            type="button"
                                            className="rounded-md border border-r5-border-subtle px-2 py-1 text-[11px] text-r5-text-primary hover:bg-r5-surface-hover"
                                            onClick={() => updateCard(c.key, { deadlineIso: quickDueIso(key) })}
                                          >
                                            {label}
                                          </button>
                                        ))}
                                      </div>
                                      <NativeDateInput
                                        value={toYmd(c.deadlineIso)}
                                        onChange={(e) => {
                                          const iso = fromYmd(e.target.value);
                                          updateCard(c.key, { deadlineIso: iso });
                                        }}
                                        className="w-full rounded-lg border border-r5-border-subtle bg-r5-surface-primary px-2 py-2 text-[13px] text-r5-text-primary"
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
                                <select
                                  value={c.projectId ?? ""}
                                  onChange={(e) => updateCard(c.key, { projectId: e.target.value || null })}
                                  className="rounded-lg border border-r5-border-subtle bg-r5-surface-primary px-2.5 py-1.5 text-[12px] font-medium text-r5-text-primary"
                                >
                                  <option value="">Project</option>
                                  {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                      {project.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {c.ownerNameHint ? (
                                <p className="mt-2 text-[11px] text-r5-text-secondary">
                                  Detected owner hint:{" "}
                                  <span className="text-r5-text-primary">{c.ownerNameHint}</span>
                                </p>
                              ) : null}
                              {c.deadlineOriginalPhrase ? (
                                <p className="mt-1 text-[11px] text-r5-text-secondary">
                                  Detected date phrase:{" "}
                                  <span className="text-r5-text-primary">{c.deadlineOriginalPhrase}</span>
                                </p>
                              ) : null}
                              {c.confidence !== "high" ? (
                                <p
                                  className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                    c.confidence === "low"
                                      ? "border-r5-status-overdue/40 text-r5-text-primary"
                                      : "border-r5-status-at-risk/40 text-r5-text-primary"
                                  }`}
                                >
                                  {c.confidence === "low" ? "Review carefully" : "Needs review"}
                                </p>
                              ) : null}
                              {c.isImplied ? (
                                <p className="mt-1 text-[11px] text-r5-text-secondary">
                                  Implied commitment
                                  {c.impliedReason ? (
                                    <>
                                      : <span className="text-r5-text-primary">{c.impliedReason}</span>
                                    </>
                                  ) : null}
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
                        <p className="rounded-lg border border-r5-status-overdue/35 bg-r5-status-overdue/10 px-3 py-2 text-[13px] text-r5-text-primary">
                          {commitError}
                        </p>
                      ) : null}

                      <div className="sticky bottom-0 border-t border-r5-border-subtle bg-r5-surface-primary/90 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
                        <button
                          type="button"
                          data-capture-commit="true"
                          disabled={phase === "committing" || cards.length === 0}
                          onClick={() => void commitAll()}
                          className="w-full rounded-xl bg-r5-accent py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {phase === "committing"
                            ? "Committing…"
                            : `Commit ${cards.length} commitment${cards.length === 1 ? "" : "s"}`}
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={phase === "committing"}
                        onClick={() => {
                          setPhase("input");
                          setCards([]);
                          setSelectedCardKeys([]);
                          saveCaptureDraft(selfId, text);
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
