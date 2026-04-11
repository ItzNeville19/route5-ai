"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  createTodo,
  loadDashboardTodos,
  saveDashboardTodos,
  type DashboardTodo,
} from "@/lib/dashboard-todos";

type Props = {
  projectCount: number;
  extractionCount: number;
};

/** Heuristic “AI” suggestions — no network call; feels helpful when API keys missing. */
function suggestLines(projectCount: number, extractionCount: number): string[] {
  const lines: string[] = [];
  if (projectCount === 0) {
    lines.push("Create your first project");
  } else {
    lines.push("Review latest extraction for action items");
  }
  if (extractionCount === 0) {
    lines.push("Run an extraction on pasted notes");
  } else {
    lines.push("Pin a project in the sidebar");
  }
  lines.push("Check Connections in the sidebar");
  return lines.slice(0, 3);
}

export default function DashboardDailyTodos({ projectCount, extractionCount }: Props) {
  const [items, setItems] = useState<DashboardTodo[]>([]);
  const [draft, setDraft] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    setItems(loadDashboardTodos());
  }, []);

  useEffect(() => {
    saveDashboardTodos(items);
  }, [items]);

  const add = useCallback(() => {
    const t = draft.trim();
    if (!t) return;
    setItems((prev) => [...prev, createTodo(t)]);
    setDraft("");
  }, [draft]);

  const toggle = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x))
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const suggest = useCallback(async () => {
    setSuggesting(true);
    try {
      const res = await fetch("/api/workspace/dashboard-customize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          companyContext: `Team workspace snapshot: ${projectCount} projects, ${extractionCount} extractions completed. Suggest three concrete next tasks for an operator (each under 72 characters).`,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        shortcuts?: { label: string; href: string }[];
      };
      const fromApi = data.shortcuts?.map((s) => s.label?.trim()).filter(Boolean) ?? [];
      const fallback = suggestLines(projectCount, extractionCount);
      const merged = [...fromApi, ...fallback].filter(Boolean).slice(0, 3);
      setItems((prev) => {
        const existing = new Set(prev.map((p) => p.text.toLowerCase()));
        const addNew = merged.filter((t) => t && !existing.has(t.toLowerCase()));
        return [...prev, ...addNew.map((text) => createTodo(text))];
      });
    } catch {
      const fallback = suggestLines(projectCount, extractionCount);
      setItems((prev) => [...prev, ...fallback.map((text) => createTodo(text))]);
    } finally {
      setSuggesting(false);
    }
  }, [extractionCount, projectCount]);

  const open = items.filter((x) => !x.done).length;
  const done = items.length - open;

  return (
    <div className="mt-3 rounded-xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm sm:p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Today
          </p>
          <p className="mt-0.5 text-[12px] font-semibold text-zinc-100">Focus list</p>
          <p className="mt-0.5 text-[10px] text-zinc-500">
            {open > 0 ? `${open} open` : "All clear"}
            {done > 0 ? ` · ${done} done` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => void suggest()}
            disabled={suggesting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:bg-white/[0.09] disabled:opacity-50"
          >
            {suggesting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-violet-300" aria-hidden />
            )}
            Suggest
          </button>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5" aria-label="Today focus tasks">
        {items.length === 0 ? (
          <li className="rounded-xl border border-dashed border-white/[0.08] px-3 py-3 text-center text-[12px] text-zinc-500">
            Add what matters for your org today — or tap Suggest.
          </li>
        ) : (
          items.map((todo) => (
            <li
              key={todo.id}
              className="group flex items-start gap-2 rounded-xl border border-white/[0.06] bg-black/20 px-2.5 py-2"
            >
              <button
                type="button"
                onClick={() => toggle(todo.id)}
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                  todo.done
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-white/15 bg-white/[0.04] text-transparent hover:border-white/25"
                }`}
                aria-pressed={todo.done}
                aria-label={todo.done ? "Mark not done" : "Mark done"}
              >
                {todo.done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
              </button>
              <input
                value={todo.text}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((x) =>
                      x.id === todo.id
                        ? { ...x, text: e.target.value.slice(0, 500) }
                        : x
                    )
                  )
                }
                className={`min-w-0 flex-1 bg-transparent text-[13px] leading-snug text-zinc-100 outline-none placeholder:text-zinc-600 ${
                  todo.done ? "text-zinc-500 line-through" : ""
                }`}
                aria-label="Task"
              />
              <button
                type="button"
                onClick={() => remove(todo.id)}
                className="shrink-0 rounded-lg p-1.5 text-zinc-600 opacity-0 transition hover:bg-white/[0.06] hover:text-zinc-300 group-hover:opacity-100"
                aria-label="Remove task"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a task…"
          className="min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-black/25 px-3 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-white/20"
          aria-label="New task"
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-3 py-2 text-zinc-950 shadow-md transition hover:bg-zinc-100"
          aria-label="Add task"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
