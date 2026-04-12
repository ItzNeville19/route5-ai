/** Daily focus list — local only, Apple-style checklist on the dashboard. */

export type DashboardTodo = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  /** Primary route for this task (Desk, Integrations, etc.) */
  href?: string;
  /** Deeper explanation — usually /docs */
  learnMoreHref?: string;
};

const LEGACY_TODO_KEY = "route5:dashboardTodos.v1";

function todoStorageKey(userId?: string | null): string {
  const u = userId?.trim();
  return u ? `route5:dashboardTodos.v1:user:${u}` : LEGACY_TODO_KEY;
}

function uid(): string {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadDashboardTodos(userId?: string | null): DashboardTodo[] {
  if (typeof window === "undefined") return [];
  try {
    let raw = localStorage.getItem(todoStorageKey(userId));
    if (!raw && userId?.trim()) {
      const leg = localStorage.getItem(LEGACY_TODO_KEY);
      if (leg) {
        localStorage.setItem(todoStorageKey(userId), leg);
        raw = leg;
      }
    }
    if (!raw && !userId?.trim()) {
      raw = localStorage.getItem(LEGACY_TODO_KEY);
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is DashboardTodo =>
          x &&
          typeof x === "object" &&
          typeof (x as DashboardTodo).id === "string" &&
          typeof (x as DashboardTodo).text === "string" &&
          typeof (x as DashboardTodo).done === "boolean"
      )
      .map((t) => ({
        ...t,
        text: t.text.slice(0, 500),
        createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
        href: typeof (t as DashboardTodo).href === "string" ? (t as DashboardTodo).href : undefined,
        learnMoreHref:
          typeof (t as DashboardTodo).learnMoreHref === "string"
            ? (t as DashboardTodo).learnMoreHref
            : undefined,
      }))
      .slice(0, 40);
  } catch {
    return [];
  }
}

export function saveDashboardTodos(todos: DashboardTodo[], userId?: string | null): void {
  try {
    localStorage.setItem(todoStorageKey(userId), JSON.stringify(todos.slice(0, 40)));
  } catch {
    /* ignore */
  }
}

export function createTodo(
  text: string,
  opts?: { href?: string; learnMoreHref?: string }
): DashboardTodo {
  return {
    id: uid(),
    text: text.trim().slice(0, 500),
    done: false,
    createdAt: Date.now(),
    href: opts?.href,
    learnMoreHref: opts?.learnMoreHref,
  };
}
