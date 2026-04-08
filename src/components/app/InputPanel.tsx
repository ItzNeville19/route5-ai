"use client";

import { useState } from "react";

type Props = {
  projectId: string;
  getIdToken: () => Promise<string>;
  onExtracted: () => void;
};

export default function InputPanel({ projectId, getIdToken, onExtracted }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rawInput = text.trim();
    if (!rawInput) {
      setError("Paste some text to analyze.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projectId, rawInput }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Processing failed.");
        return;
      }
      setText("");
      onExtracted();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border-dark)] bg-[var(--surface)] p-5 sm:p-6">
      <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-white">
        New input
      </h2>
      <p className="mt-1 text-[13px] text-[var(--text-muted-light)]">
        Paste Slack threads, meeting notes, or any text. We extract decisions and
        action items.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste content here…"
          rows={6}
          className="w-full resize-y rounded-xl border border-[var(--border-dark)] bg-[var(--bg-dark)] px-4 py-3 text-[14px] leading-relaxed text-[var(--text-light)] placeholder:text-[var(--text-muted-light)] focus:border-[var(--blue)] focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
        />
        {error && (
          <p className="text-[13px] text-red-400" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary rounded-xl px-5 py-2.5 text-[14px] font-medium disabled:opacity-50"
        >
          {loading ? "Processing…" : "Extract intelligence"}
        </button>
      </form>
    </section>
  );
}
