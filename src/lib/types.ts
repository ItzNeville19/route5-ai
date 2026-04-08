import type { Timestamp } from "firebase/firestore";
import type { ActionItemStored } from "@/lib/ai/schema";

export type Project = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Extraction = {
  id: string;
  ownerId: string;
  rawInput: string;
  summary: string;
  decisions: string[];
  actionItems: ActionItemStored[];
  createdAt: Timestamp;
};
