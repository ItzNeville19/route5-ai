"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubProjects: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth(), (user) => {
      unsubProjects?.();
      if (!user) {
        setLoading(false);
        setProjects([]);
        return;
      }

      const q = query(
        collection(db(), "projects"),
        where("ownerId", "==", user.uid)
      );

      unsubProjects = onSnapshot(
        q,
        (snap) => {
          setLoading(false);
          const list: Project[] = [];
          snap.forEach((docSnap) => {
            const d = docSnap.data() as Record<string, unknown>;
            const n = typeof d.name === "string" ? d.name : "Untitled";
            const ownerId = typeof d.ownerId === "string" ? d.ownerId : "";
            const createdAt = d.createdAt as Project["createdAt"];
            const updatedAt = d.updatedAt as Project["updatedAt"];
            if (createdAt && updatedAt) {
              list.push({
                id: docSnap.id,
                name: n,
                ownerId,
                createdAt,
                updatedAt,
              });
            }
          });
          list.sort(
            (a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis()
          );
          setProjects(list);
        },
        () => {
          setLoading(false);
          setError("Could not load projects.");
        }
      );
    });

    return () => {
      unsubAuth();
      unsubProjects?.();
    };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const user = auth().currentUser;
    if (!user) return;
    setError(null);
    setCreating(true);
    try {
      await addDoc(collection(db(), "projects"), {
        name: trimmed,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setName("");
    } catch {
      setError("Could not create project.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white">
          Projects
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-muted-light)]">
          Your command centers for execution intelligence.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--border-dark)] bg-[var(--surface)] p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-white">New project</h2>
        <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="project-name" className="sr-only">
              Project name
            </label>
            <input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q1 launch"
              className="w-full rounded-xl border border-[var(--border-dark)] bg-[var(--bg-dark)] px-4 py-2.5 text-[14px] text-white placeholder:text-[var(--text-muted-light)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
            />
          </div>
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="btn-primary shrink-0 rounded-xl px-5 py-2.5 text-[14px] font-medium disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </form>
        {error && (
          <p className="mt-3 text-[13px] text-red-400" role="alert">
            {error}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-[15px] font-semibold text-white">Your projects</h2>
        {loading ? (
          <div className="mt-6 flex justify-center py-12">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--gray-90)]" />
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-dark)] px-6 py-12 text-center">
            <p className="text-[14px] text-[var(--text-muted-light)]">
              No projects yet. Create one above to get started in under a minute.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="block rounded-xl border border-[var(--border-dark)] bg-[var(--surface)] px-4 py-4 transition hover:border-[var(--gray-80)]"
                >
                  <span className="text-[15px] font-medium text-white">
                    {p.name}
                  </span>
                  <span className="mt-1 block text-[12px] text-[var(--text-muted-light)]">
                    Open dashboard →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
