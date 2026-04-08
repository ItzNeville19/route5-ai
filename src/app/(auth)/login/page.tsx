"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import AuthForm from "@/components/app/AuthForm";

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = onAuthStateChanged(auth(), (u) => {
        if (u) {
          router.replace("/projects");
        } else {
          setChecking(false);
        }
      });
    } catch {
      queueMicrotask(() => setChecking(false));
    }
    return () => unsub?.();
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-dark)]">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--gray-90)]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-dark)] px-4 py-12">
      <AuthForm onSuccess={() => router.replace("/projects")} />
    </div>
  );
}
