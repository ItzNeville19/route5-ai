"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import AppHeader from "@/components/app/AppHeader";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = onAuthStateChanged(auth(), (u) => {
        setUser(u);
        if (u === null) {
          router.replace("/login");
        }
      });
    } catch {
      queueMicrotask(() => {
        setUser(null);
        router.replace("/login");
      });
    }
    return () => unsub?.();
  }, [router]);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-dark)] text-[var(--text-light)]">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--gray-90)]" />
        <p className="mt-4 text-[13px] text-[var(--text-muted-light)]">
          Loading…
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-dark)] text-[var(--text-light)]">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
