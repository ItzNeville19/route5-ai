"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Send, X } from "lucide-react";
import { useWorkspaceChromeActions } from "@/components/workspace/WorkspaceChromeActions";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";

type OrgPayload = {
  members?: Array<{ userId: string; displayName: string; role: string }>;
};

/** Request status updates from selected teammates (in-app and per notification preferences). */
export default function WorkspaceSendUpdateModal() {
  const { sendUpdateOpen, closeSendUpdate } = useWorkspaceChromeActions();
  const { pushToast } = useWorkspaceExperience();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [members, setMembers] = useState<OrgPayload["members"]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!sendUpdateOpen) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/workspace/organization", { credentials: "same-origin" });
        const data = (await res.json().catch(() => ({}))) as OrgPayload;
        if (cancelled || !res.ok) return;
        const list = data.members ?? [];
        setMembers(list);
        const init: Record<string, boolean> = {};
        for (const m of list) {
          if (m.role === "member" || m.role === "manager") init[m.userId] = m.role === "member";
        }
        setSelected(init);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sendUpdateOpen]);

  const recipientIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => id),
    [selected]
  );

  const canSend = useMemo(
    () => Boolean(title.trim().length >= 3 && body.trim().length >= 1 && recipientIds.length > 0),
    [title, body, recipientIds.length]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    setNotice(null);
    try {
      const res = await fetch("/api/workspace/send-update-request", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          recipientUserIds: recipientIds,
          linkPath: "/workspace/dashboard?view=employee",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; sent?: number };
      if (!res.ok) {
        setNotice(data.error ?? "Could not send.");
        return;
      }
      pushToast(`Update request sent to ${data.sent ?? recipientIds.length} teammate(s).`, "success");
      setTitle("");
      setBody("");
      closeSendUpdate();
    } finally {
      setSending(false);
    }
  }

  if (!mounted || !sendUpdateOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-center justify-center px-3 py-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Close modal"
        onClick={() => closeSendUpdate()}
      />
      <div
        role="dialog"
        aria-labelledby="send-update-heading"
        className="relative z-[1] max-h-[min(92dvh,720px)] w-full max-w-[520px] overflow-hidden rounded-[22px] border border-cyan-500/22 bg-[linear-gradient(165deg,rgba(10,32,42,0.97),rgba(5,10,14,0.99))] shadow-[0_40px_120px_-48px_rgba(34,211,238,0.45)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/45">Leadership</p>
            <h2 id="send-update-heading" className="mt-1 text-lg font-semibold text-white">
              Send update request
            </h2>
            <p className="mt-1 text-[12px] text-white/45">
              Notify teammates with a concise ask — respects notification preferences.
            </p>
          </div>
          <button
            type="button"
            onClick={() => closeSendUpdate()}
            className="route5-pressable inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-black/35 text-white/70 hover:border-cyan-400/35 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex max-h-[calc(min(92dvh,720px)-140px)] flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {loading ? (
              <div className="flex items-center gap-2 text-[13px] text-white/55">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400/85" />
                Loading roster…
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/42">Title</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Weekly checkpoint — send status"
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 text-[14px] text-white placeholder:text-white/28 outline-none focus:border-cyan-400/38"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/42">Message</span>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="What you need back, by when, and where to reply."
                    rows={5}
                    className="mt-1.5 w-full resize-y rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2.5 text-[14px] text-white placeholder:text-white/28 outline-none focus:border-cyan-400/38"
                  />
                </label>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/42">Recipients</p>
                  <ul className="mt-2 max-h-[180px] space-y-2 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/28 p-2">
                    {(members ?? []).map((m) => (
                      <li key={m.userId}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]">
                          <input
                            type="checkbox"
                            checked={Boolean(selected[m.userId])}
                            onChange={(e) =>
                              setSelected((prev) => ({ ...prev, [m.userId]: e.target.checked }))
                            }
                            className="rounded border-white/20 bg-black/50 text-cyan-500 focus:ring-cyan-400/40"
                          />
                          <span className="text-[13px] text-white/88">{m.displayName}</span>
                          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-white/35">
                            {m.role}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>

                {notice ? <p className="text-[12px] text-amber-200/95">{notice}</p> : null}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 border-t border-white/[0.06] px-5 py-4">
            <button
              type="submit"
              disabled={!canSend || sending || loading}
              className="route5-pressable inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-500/38 bg-cyan-950/50 px-4 text-[14px] font-semibold text-cyan-50 shadow-[0_12px_40px_-18px_rgba(8,145,178,0.45)] disabled:opacity-45"
            >
              <Send className="h-4 w-4" />
              {sending ? "Sending…" : "Send"}
            </button>
            <button
              type="button"
              onClick={() => closeSendUpdate()}
              className="route5-pressable inline-flex min-h-11 items-center justify-center rounded-xl border border-white/[0.1] bg-black/35 px-4 text-[14px] font-medium text-white/75 hover:border-white/20"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
