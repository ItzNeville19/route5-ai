"use client";

import { type FormEvent, useState } from "react";

type Tone = "light" | "command";

export default function PublicEmailSubscribe({
  tone = "light",
  source = "footer",
}: {
  tone?: Tone;
  source?: "footer" | "contact" | "landing";
}) {
  const command = tone === "command";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const label = command ? "text-zinc-200" : "text-[#1d1d1f]/90";
  const input =
    command
      ? "border-white/15 bg-white/5 text-white placeholder:text-zinc-500"
      : "border-black/[0.06] bg-white text-[#1d1d1f] placeholder:text-[#86868b]";
  const btn =
    command
      ? "bg-violet-500 text-white hover:bg-violet-400"
      : "bg-[#0071e3] text-white hover:bg-[#0077ed]";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/public/email-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setStatus("err");
        setMessage(data.error ?? "Could not subscribe.");
        return;
      }
      setStatus("ok");
      setMessage("You’re on the list — we’ll email product updates and invitations tips.");
      setEmail("");
    } catch {
      setStatus("err");
      setMessage("Could not subscribe. Try again in a moment.");
    }
  }

  return (
    <div className="mt-6 max-w-md">
      <p className={`text-[13px] font-semibold ${label}`}>Email updates</p>
      <p className={`mt-1 text-[12px] leading-relaxed ${command ? "text-zinc-400" : "text-[#6e6e73]"}`}>
        Product updates and workspace tips — even if you don&apos;t have an account yet.
      </p>
      <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`min-h-11 w-full flex-1 rounded-xl border px-3 py-2 text-[14px] outline-none ring-0 focus:border-violet-400/50 ${input}`}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-4 text-[13px] font-semibold transition disabled:opacity-60 ${btn}`}
        >
          {status === "loading" ? "…" : "Subscribe"}
        </button>
      </form>
      {message ? (
        <p
          className={`mt-2 text-[12px] ${status === "ok" ? (command ? "text-emerald-300/95" : "text-emerald-700") : command ? "text-amber-200/90" : "text-amber-800"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
