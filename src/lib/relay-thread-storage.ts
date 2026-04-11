/** Multi-thread Relay chat — persisted like ChatGPT sidebar history. */

import type { RelayMsg } from "@/lib/relay-thread-types";

export type { RelayMsg } from "@/lib/relay-thread-types";

export type RelayThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: RelayMsg[];
};

const STORE_KEY = "route5:relayThreadStore.v2";
const LEGACY_KEY = "route5:relayThread.v1";

export type RelayThreadStore = {
  activeId: string;
  threads: Record<string, RelayThread>;
};

function newId(): string {
  return `th-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadRelayThreadStore(): RelayThreadStore {
  if (typeof window === "undefined") {
    return { activeId: "default", threads: {} };
  }
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const o = JSON.parse(raw) as Partial<RelayThreadStore>;
      const activeId = typeof o.activeId === "string" ? o.activeId : "default";
      const threads =
        o.threads && typeof o.threads === "object"
          ? (o.threads as Record<string, RelayThread>)
          : {};
      return { activeId, threads };
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as unknown;
      const messages = Array.isArray(parsed)
        ? (parsed as RelayMsg[]).filter(
            (m) =>
              m &&
              typeof m === "object" &&
              typeof m.id === "string" &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.text === "string"
          )
        : [];
      const thread: RelayThread = {
        id: "default",
        title: threadTitleFromMessages(messages),
        updatedAt: Date.now(),
        messages,
      };
      return { activeId: "default", threads: { default: thread } };
    }
  } catch {
    /* ignore */
  }
  return { activeId: "default", threads: {} };
}

export function saveRelayThreadStore(store: RelayThreadStore): void {
  try {
    const trimmed: Record<string, RelayThread> = {};
    const entries = Object.values(store.threads)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 24);
    for (const t of entries) {
      trimmed[t.id] = {
        ...t,
        messages: t.messages.slice(-80),
      };
    }
    const activeId = trimmed[store.activeId] ? store.activeId : entries[0]?.id ?? store.activeId;
    localStorage.setItem(STORE_KEY, JSON.stringify({ activeId, threads: trimmed }));
  } catch {
    /* ignore */
  }
}

export function threadTitleFromMessages(messages: RelayMsg[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (firstUser?.text?.trim()) {
    const t = firstUser.text.trim().replace(/\s+/g, " ");
    return t.length > 36 ? `${t.slice(0, 34)}…` : t;
  }
  return "New chat";
}

export function ensureActiveThread(store: RelayThreadStore): RelayThreadStore {
  const ids = Object.keys(store.threads);
  if (ids.length === 0) {
    const id = "default";
    return {
      activeId: id,
      threads: {
        [id]: {
          id,
          title: "New chat",
          updatedAt: Date.now(),
          messages: [],
        },
      },
    };
  }
  if (!store.threads[store.activeId]) {
    const newest = Object.values(store.threads).sort((a, b) => b.updatedAt - a.updatedAt)[0];
    return { ...store, activeId: newest.id };
  }
  return store;
}

export function createEmptyThread(): RelayThread {
  const id = newId();
  return {
    id,
    title: "New chat",
    updatedAt: Date.now(),
    messages: [],
  };
}
