"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { Extraction, Project } from "@/lib/types";
import type { ActionItemStored } from "@/lib/ai/schema";
import InputPanel from "@/components/app/InputPanel";
import ExtractionCard from "@/components/app/ExtractionCard";

function mapExtraction(
  id: string,
  data: Record<string, unknown>
): Extraction | null {
  if (
    typeof data.ownerId !== "string" ||
    typeof data.rawInput !== "string" ||
    typeof data.summary !== "string" ||
    !Array.isArray(data.decisions)
  ) {
    return null;
  }
  const decisions = data.decisions.filter(
    (d): d is string => typeof d === "string"
  );
  const rawItems = Array.isArray(data.actionItems) ? data.actionItems : [];
  const actionItems: ActionItemStored[] = [];
  for (const item of rawItems) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const idItem = typeof o.id === "string" ? o.id : "";
    const text = typeof o.text === "string" ? o.text : "";
    if (!idItem || !text) continue;
    const owner =
      o.owner === null || o.owner === undefined
        ? null
        : typeof o.owner === "string"
          ? o.owner
          : null;
    actionItems.push({
      id: idItem,
      text,
      owner,
      completed: Boolean(o.completed),
    });
  }

  if (!(data.createdAt instanceof Timestamp)) {
    return null;
  }

  return {
    id,
    ownerId: data.ownerId,
    rawInput: data.rawInput,
    summary: data.summary,
    decisions,
    actionItems,
    createdAt: data.createdAt,
  };
}

type Props = { projectId: string };

export default function ProjectDashboard({ projectId }: Props) {
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [listErr, setListErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const ref = doc(db(), "projects", projectId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setProject(null);
          return;
        }
        const d = snap.data() as Record<string, unknown>;
        const name = typeof d.name === "string" ? d.name : "Untitled";
        const ownerId = typeof d.ownerId === "string" ? d.ownerId : "";
        const createdAt = d.createdAt as Project["createdAt"];
        const updatedAt = d.updatedAt as Project["updatedAt"];
        if (!createdAt || !updatedAt) {
          setProject(null);
          return;
        }
        setProject({
          id: snap.id,
          name,
          ownerId,
          createdAt,
          updatedAt,
        });
      } catch {
        setProject(null);
      }
    })();
  }, [projectId]);

  useEffect(() => {
    if (project === null || project === undefined) return;
    const q = query(
      collection(db(), "projects", projectId, "extractions"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setListErr(null);
        const list: Extraction[] = [];
        snap.forEach((docSnap) => {
          const m = mapExtraction(docSnap.id, docSnap.data() as Record<string, unknown>);
          if (m) list.push(m);
        });
        setExtractions(list);
      },
      () => {
        setListErr("Could not load extractions.");
      }
    );
    return () => unsub();
  }, [projectId, project]);

  async function getIdToken() {
    const user = auth().currentUser;
    if (!user) throw new Error("Not signed in");
    return user.getIdToken();
  }

  if (project === undefined) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--gray-90)]" />
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="rounded-2xl border border-[var(--border-dark)] bg-[var(--surface)] p-8 text-center">
        <p className="text-[14px] text-[var(--text-muted-light)]">
          Project not found or you don&apos;t have access.
        </p>
        <Link
          href="/projects"
          className="mt-4 inline-block text-[14px] text-[var(--blue)] hover:underline"
        >
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/projects"
          className="text-[13px] text-[var(--text-muted-light)] hover:text-white"
        >
          ← Projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
          {project.name}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-muted-light)]">
          Paste inputs below. Intelligence updates appear as you go.
        </p>
      </div>

      <InputPanel
        projectId={projectId}
        getIdToken={getIdToken}
        onExtracted={() => {
          /* onSnapshot refreshes list */
        }}
      />

      <section className="space-y-4">
        <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-white">
          Intelligence
        </h2>
        {listErr && (
          <p className="text-[13px] text-red-400" role="alert">
            {listErr}
          </p>
        )}
        {!listErr && extractions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--border-dark)] bg-[var(--surface)]/50 px-6 py-12 text-center">
            <p className="text-[14px] text-[var(--text-muted-light)]">
              No extractions yet. Paste your first input above to see decisions
              and action items here.
            </p>
          </div>
        )}
        <div className="space-y-6">
          {extractions.map((ex) => (
            <ExtractionCard key={ex.id} projectId={projectId} extraction={ex} />
          ))}
        </div>
      </section>
    </div>
  );
}
