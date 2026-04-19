"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type MemberProfile = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl: string | null;
  primaryEmail: string | null;
};

type MemberDirectoryValue = {
  map: Map<string, MemberProfile>;
  get: (userId: string) => MemberProfile | undefined;
  /** Resolved display name using Clerk profile when available. */
  displayName: (userId: string, selfId: string | undefined, selfDisplayName: string) => string;
  refresh: () => Promise<void>;
  loaded: boolean;
};

const MemberDirectoryContext = createContext<MemberDirectoryValue | null>(null);

export function MemberProfilesProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = useState(() => new Map<string, MemberProfile>());
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/collaborators", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        collaborators?: MemberProfile[];
      };
      if (!res.ok) return;
      const next = new Map<string, MemberProfile>();
      for (const c of data.collaborators ?? []) {
        if (c?.userId) next.set(c.userId, c);
      }
      setMap(next);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => void load();
    window.addEventListener("route5:commitments-changed", onRefresh);
    window.addEventListener("route5:project-updated", onRefresh);
    return () => {
      window.removeEventListener("route5:commitments-changed", onRefresh);
      window.removeEventListener("route5:project-updated", onRefresh);
    };
  }, [load]);

  const get = useCallback((userId: string) => map.get(userId), [map]);

  const displayName = useCallback(
    (userId: string, selfId: string | undefined, selfDisplayName: string) => {
      if (!userId.trim()) return "Unassigned";
      if (selfId && userId === selfId) {
        const d = selfDisplayName.trim();
        return d || "You";
      }
      const p = map.get(userId);
      if (p) {
        const n = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
        if (n) return n;
        if (p.username?.trim()) return `@${p.username.trim()}`;
        if (p.primaryEmail) {
          const local = p.primaryEmail.split("@")[0];
          if (local) return local;
        }
      }
      return userId.length > 18 ? `${userId.slice(0, 16)}…` : userId;
    },
    [map]
  );

  const value = useMemo(
    () => ({ map, get, displayName, refresh: load, loaded }),
    [map, get, displayName, load, loaded]
  );

  return (
    <MemberDirectoryContext.Provider value={value}>{children}</MemberDirectoryContext.Provider>
  );
}

export function useMemberDirectory(): MemberDirectoryValue {
  const ctx = useContext(MemberDirectoryContext);
  if (!ctx) {
    throw new Error("useMemberDirectory must be used inside MemberProfilesProvider");
  }
  return ctx;
}
