import type { ActionItemStored } from "@/lib/ai/schema";

export type Project = {
  id: string;
  name: string;
  /** Single emoji or short glyph shown in sidebar / dashboard */
  iconEmoji?: string | null;
  memberUserIds?: string[];
  clerkUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type Extraction = {
  id: string;
  projectId: string;
  clerkUserId: string;
  rawInput: string;
  /** Short headline / stakes — not a paste replay (see problem & solution). */
  summary: string;
  /** Core pressure, gap, or ambiguity to resolve. */
  problem: string;
  /** Agreed or recommended direction; may state options if undecided. */
  solution: string;
  /** Unknowns still to answer (0–8 in model; empty when none). */
  openQuestions: string[];
  decisions: string[];
  actionItems: ActionItemStored[];
  createdAt: string;
};
