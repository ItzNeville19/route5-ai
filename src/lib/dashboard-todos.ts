/** Daily focus list — local only, Apple-style checklist on the dashboard. */

export type DashboardTodo = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
};

const KEY = "route5:dashboardTodos.v1";

function uid(): string {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadDashboardTodos(): DashboardTodo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
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
      }))
      .slice(0, 40);
  } catch {
    return [];
  }
}

export function saveDashboardTodos(todos: DashboardTodo[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(todos.slice(0, 40)));
  } catch {
    /* ignore */
  }
}

export function createTodo(text: string): DashboardTodo {
  return {
    id: uid(),
    text: text.trim().slice(0, 500),
    done: false,
    createdAt: Date.now(),
  };
}
