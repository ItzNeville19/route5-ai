"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export default function AuthForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const a = auth();
      if (isSignUp) {
        await createUserWithEmailAndPassword(a, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(a, email.trim(), password);
      }
      onSuccess();
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setError("Invalid email or password.");
      } else if (code === "auth/email-already-in-use") {
        setError("That email is already registered. Try signing in.");
      } else if (code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setPending(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth(), provider);
      onSuccess();
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      if (code === "auth/popup-closed-by-user") {
        setError(null);
      } else {
        setError("Google sign-in failed.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-[-0.03em] text-white">
          {isSignUp ? "Create account" : "Sign in"}
        </h1>
        <p className="text-[13px] text-[var(--text-muted-light)]">
          Command center for decisions and action items
        </p>
      </div>

      <button
        type="button"
        onClick={() => void handleGoogle()}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-dark)] bg-[var(--surface)] px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-[var(--surface-light)] disabled:opacity-50"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border-dark)]" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
          <span className="bg-[var(--bg-dark)] px-2 text-[var(--text-muted-light)]">
            or email
          </span>
        </div>
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-4">
        <div>
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-[var(--border-dark)] bg-[var(--surface)] px-4 py-2.5 text-[14px] text-white placeholder:text-[var(--text-muted-light)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
          />
        </div>
        <div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-[var(--border-dark)] bg-[var(--surface)] px-4 py-2.5 text-[14px] text-white placeholder:text-[var(--text-muted-light)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
          />
        </div>

        {error && (
          <p className="text-[13px] text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full rounded-xl py-2.5 text-[14px] font-medium disabled:opacity-50"
        >
          {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-[13px] text-[var(--text-muted-light)]">
        {isSignUp ? "Already have an account? " : "New here? "}
        <button
          type="button"
          className="text-[var(--blue)] hover:underline"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
          }}
        >
          {isSignUp ? "Sign in" : "Create account"}
        </button>
      </p>
    </div>
  );
}
