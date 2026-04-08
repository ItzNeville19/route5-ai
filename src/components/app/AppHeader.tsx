"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export default function AppHeader() {
  async function handleSignOut() {
    await signOut(auth());
  }

  return (
    <header className="border-b border-[var(--border-dark)] bg-[var(--bg-dark)]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/projects"
          className="text-[15px] font-semibold tracking-[-0.03em] text-white hover:text-[var(--text-muted-light)] transition-colors"
        >
          Route 5
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-[13px] text-[var(--text-muted-light)] hover:text-white transition-colors"
          >
            Marketing
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="text-[13px] text-[var(--text-muted-light)] hover:text-white transition-colors"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
