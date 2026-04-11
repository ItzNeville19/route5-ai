import type { ActionItemStored } from "@/lib/ai/schema";

export type Project = {
  id: string;
  name: string;
  /** Single emoji or short glyph shown in sidebar / dashboard */
  iconEmoji?: string | null;
  clerkUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type Extraction = {
  id: string;
  projectId: string;
  clerkUserId: string;
  rawInput: string;
  summary: string;
  decisions: string[];
  actionItems: ActionItemStored[];
  createdAt: string;
};
