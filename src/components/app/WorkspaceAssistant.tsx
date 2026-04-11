"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useUser } from "@clerk/nextjs";
import { Eraser, MessageCircle, Plus, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CommandOrbIcon } from "@/components/brand/CommandOrbIcon";
import { MERIDIAN_FULL, MERIDIAN_SHORT, MERIDIAN_TAGLINE } from "@/lib/assistant-brand";
import type { RelayMsg } from "@/lib/relay-thread-types";
import {
  createEmptyThread,
  ensureActiveThread,
  loadRelayThreadStore,
  saveRelayThreadStore,
  threadTitleFromMessages,
  type RelayThreadStore,
} from "@/lib/relay-thread-storage";

const MEMORY_KEY = "route5:assistantMemory.v1";

function loadMemory(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(MEMORY_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveMemory(text: string) {
  try {
    localStorage.setItem(MEMORY_KEY, text.slice(0, 6000));
  } catch {
    /* ignore */
  }
}

const SUGGESTIONS = [
  "What should I do next in Route5?",
  "Explain projects vs extractions in one paragraph.",
  "How do I use Linear or GitHub in Route5?",
] as const;

function welcomeLine(firstName: string): RelayMsg {
  return {
    id: "w",
    role: "assistant",
    text: `Hi ${firstName} — I’m ${MERIDIAN_SHORT}. I use your live project and extraction counts when you ask. Tap a shortcut below, or message me about Route5.`,
    ts: Date.now(),
  };
}

export default function WorkspaceAssistant() {
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [memory, setMemory] = useState("");
  const [store, setStore] = useState<RelayThreadStore>(() =>
    ensureActiveThread(loadRelayThreadStore())
  );
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const firstName =
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "there";

  const active = store.threads[store.activeId];
  const messages = active?.messages ?? [];

  const threadList = Object.values(store.threads).sort((a, b) => b.updatedAt - a.updatedAt);

  useEffect(() => {
    setMounted(true);
    setMemory(loadMemory());
    setStore(ensureActiveThread(loadRelayThreadStore()));
  }, []);

  useEffect(() => {
    saveRelayThreadStore(store);
  }, [store]);

  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    const openEv = () => setOpen(true);
    window.addEventListener("route5:assistant-toggle", toggle);
    window.addEventListener("route5:assistant-open", openEv);
    return () => {
      window.removeEventListener("route5:assistant-toggle", toggle);
      window.removeEventListener("route5:assistant-open", openEv);
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, sending]);

  const patchActiveMessages = useCallback((nextMessages: RelayMsg[]) => {
    setStore((s) => {
      const t = s.threads[s.activeId];
      if (!t) return s;
      const title = threadTitleFromMessages(nextMessages);
      return {
        ...s,
        threads: {
          ...s.threads,
          [s.activeId]: {
            ...t,
            messages: nextMessages,
            title,
            updatedAt: Date.now(),
          },
        },
      };
    });
  }, []);

  const ensureWelcome = useCallback(() => {
    setStore((s) => {
      const t = s.threads[s.activeId];
      if (!t || t.messages.length > 0) return s;
      return {
        ...s,
        threads: {
          ...s.threads,
          [s.activeId]: {
            ...t,
            messages: [welcomeLine(firstName)],
            updatedAt: Date.now(),
          },
        },
      };
    });
  }, [firstName]);

  useEffect(() => {
    if (open) {
      ensureWelcome();
      window.setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [open, ensureWelcome]);

  const newChat = useCallback(() => {
    const nt = createEmptyThread();
    setStore((s) => ({
      activeId: nt.id,
      threads: { ...s.threads, [nt.id]: { ...nt, messages: [welcomeLine(firstName)] } },
    }));
  }, [firstName]);

  const selectThread = useCallback((id: string) => {
    setStore((s) => (s.threads[id] ? { ...s, activeId: id } : s));
  }, []);

  function clearThread() {
    patchActiveMessages([
      {
        id: `w-${Date.now()}`,
        role: "assistant",
        text: `Hi ${firstName} — I’m ${MERIDIAN_SHORT}. Ask anything about Route5, or tap a shortcut.`,
        ts: Date.now(),
      },
    ]);
  }

  async function send(override?: string) {
    const raw = (override ?? input).trim();
    if (!raw || sending) return;
    setInput("");
    const userMsg: RelayMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      text: raw,
      ts: Date.now(),
    };
    patchActiveMessages([...messages, userMsg]);

    let mem = memory;
    if (raw.toLowerCase().includes("remember")) {
      mem = `${memory}\n${raw}`.trim();
      setMemory(mem);
      saveMemory(mem);
    }

    setSending(true);
    const msgsForApi = [...messages, userMsg];
    try {
      const res = await fetch("/api/workspace/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          message: raw,
          memory: mem,
          firstName,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
      };

      let text: string;
      if (!res.ok) {
        const err =
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : "";
        if (res.status === 401) {
          text = "Sign in again to use Relay — your session may have expired.";
        } else if (err) {
          text = err;
        } else {
          text = "Something went wrong. Try again in a moment.";
        }
      } else {
        const reply = typeof data.reply === "string" ? data.reply.trim() : "";
        text =
          reply ||
          "Got it — ask another question, or tap a shortcut below.";
      }

      patchActiveMessages([
        ...msgsForApi,
        { id: `a-${Date.now()}`, role: "assistant", text, ts: Date.now() },
      ]);
    } catch {
      patchActiveMessages([
        ...msgsForApi,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: `Couldn’t reach ${MERIDIAN_SHORT}. Check your connection and try again.`,
          ts: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pointer-events-auto fixed bottom-5 right-5 z-[60000] flex h-14 w-14 touch-manipulation items-center justify-center rounded-full bg-[#34c759] text-white shadow-[0_8px_32px_rgba(52,199,89,0.45)] transition hover:scale-[1.03] active:scale-[0.98] md:bottom-8 md:right-8"
        style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}
        aria-label={open ? `Close ${MERIDIAN_SHORT}` : `Open ${MERIDIAN_SHORT}`}
      >
        {open ? <X className="h-7 w-7" strokeWidth={2} /> : <MessageCircle className="h-7 w-7" strokeWidth={2} />}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="sheet"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="pointer-events-auto fixed bottom-[5.5rem] right-5 z-[60000] flex max-h-[min(78vh,640px)] w-[min(100vw-2rem,520px)] flex-col overflow-hidden rounded-[1.35rem] border border-black/[0.1] bg-[#000000] shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:bottom-[6rem] md:right-8"
            role="dialog"
            aria-label={MERIDIAN_FULL}
          >
            <div className="flex min-h-0 flex-1 flex-row">
              <aside
                className="hidden w-[132px] shrink-0 flex-col border-r border-white/[0.08] bg-[#0a0a0c] sm:flex"
                aria-label="Chat history"
              >
                <button
                  type="button"
                  onClick={newChat}
                  className="mx-2 mt-2 inline-flex items-center justify-center gap-1 rounded-lg bg-[#2c2c2e] px-2 py-2 text-[11px] font-semibold text-white transition hover:bg-[#3a3a3c]"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  New
                </button>
                <div className="mt-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 pb-2">
                  {threadList.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => selectThread(th.id)}
                      className={`w-full rounded-lg px-2 py-1.5 text-left text-[11px] leading-snug transition ${
                        th.id === store.activeId
                          ? "bg-white/[0.12] text-white"
                          : "text-[#8e8e93] hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <span className="line-clamp-3">{th.title || "Chat"}</span>
                    </button>
                  ))}
                </div>
              </aside>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="shrink-0 border-b border-white/[0.08] bg-[#0a0a0c] px-2 py-1.5 sm:hidden">
                  <label className="sr-only" htmlFor="relay-thread-select">
                    Conversation
                  </label>
                  <select
                    id="relay-thread-select"
                    value={store.activeId}
                    onChange={(e) => selectThread(e.target.value)}
                    className="w-full rounded-lg border border-white/[0.12] bg-[#2c2c2e] px-2 py-1.5 text-[12px] text-white"
                  >
                    {threadList.map((th) => (
                      <option key={th.id} value={th.id}>
                        {th.title || "Chat"}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={newChat}
                    className="mt-1.5 w-full rounded-lg border border-white/[0.1] py-1.5 text-[11px] font-semibold text-[#0a84ff]"
                  >
                    New chat
                  </button>
                </div>

                <header className="flex shrink-0 items-center gap-2 border-b border-white/[0.08] bg-[#1c1c1e] px-2 py-2.5 sm:gap-3 sm:pl-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full p-2 text-[#0a84ff] text-[16px] font-normal leading-none hover:bg-white/[0.06]"
                    aria-label="Close"
                  >
                    <span className="text-[17px] leading-none">‹</span>
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col items-center sm:items-start">
                    <div className="flex items-center gap-2">
                      <span className="flex shrink-0 items-center justify-center" aria-hidden>
                        <CommandOrbIcon size="md" />
                      </span>
                      <div className="min-w-0 text-left">
                        <p className="truncate text-[14px] font-semibold text-white sm:text-[15px]">{MERIDIAN_SHORT}</p>
                        <p className="truncate text-[10px] text-[#8e8e93] sm:text-[11px]">{MERIDIAN_TAGLINE}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => clearThread()}
                    className="rounded-full p-2 text-[#8e8e93] hover:bg-white/[0.08] hover:text-white"
                    title="Clear this chat"
                    aria-label="Clear this chat"
                  >
                    <Eraser className="h-5 w-5" strokeWidth={2} />
                  </button>
                </header>

                <div
                  className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain bg-[#000000] px-2 py-3"
                  style={{
                    backgroundImage:
                      "linear-gradient(180deg, rgba(28,28,30,0.97) 0%, #000000 28%, #000000 100%)",
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="mr-auto flex max-w-[92%] gap-2">
                          <span className="mt-0.5 flex shrink-0 items-center justify-center" aria-hidden>
                            <CommandOrbIcon size="sm" />
                          </span>
                          <div className="rounded-[1.15rem] rounded-bl-md bg-[#2c2c2e] px-3.5 py-2.5 text-[15px] leading-[1.35] text-white shadow-sm">
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                            {msg.ts ? (
                              <p className="mt-1 text-[10px] text-[#636366]">
                                {new Date(msg.ts).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-[78%] rounded-[1.15rem] rounded-br-md bg-[#0a84ff] px-3.5 py-2.5 text-[15px] leading-[1.35] text-white shadow-sm">
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          {msg.ts ? (
                            <p className="mt-1 text-right text-[10px] text-white/70">
                              {new Date(msg.ts).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                  {sending ? (
                    <div className="flex justify-start pl-9">
                      <div className="flex gap-1 rounded-[1.15rem] rounded-bl-md bg-[#2c2c2e] px-4 py-3">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#8e8e93] [animation-delay:-0.2s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#8e8e93] [animation-delay:-0.1s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#8e8e93]" />
                      </div>
                    </div>
                  ) : null}
                  <div ref={endRef} />
                </div>

                <div className="shrink-0 border-t border-white/[0.06] bg-[#1c1c1e] px-2 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void send(s)}
                        disabled={sending}
                        className="rounded-full border border-white/[0.12] bg-[#2c2c2e] px-3 py-1.5 text-left text-[12px] leading-snug text-[#e5e5ea] transition hover:bg-[#3a3a3c] disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 border-t border-white/[0.08] bg-[#1c1c1e] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                  <p className="mb-2 px-1 text-[10px] text-[#8e8e93]">
                    Say <span className="font-medium text-[#e5e5ea]">remember …</span> to save facts for
                    future replies. Shift+Enter for a new line.
                  </p>
                  <div className="flex items-end gap-2">
                    <div className="relative min-h-[44px] flex-1 rounded-[1.35rem] border border-white/[0.12] bg-[#2c2c2e] px-3 pt-2.5">
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void send();
                          }
                        }}
                        placeholder="Message"
                        rows={1}
                        className="max-h-32 min-h-[44px] w-full resize-none bg-transparent pb-2 text-[16px] leading-snug text-white placeholder:text-[#636366] focus:outline-none"
                        aria-label="Message"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void send()}
                      disabled={sending || !input.trim()}
                      className="mb-0.5 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full bg-[#0a84ff] text-white shadow-md transition hover:opacity-95 disabled:opacity-35"
                      aria-label="Send"
                    >
                      <Send className="h-5 w-5" strokeWidth={2} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[12px]">
                    <Link href="/projects" className="text-[#0a84ff] hover:underline">
                      Projects
                    </Link>
                    <Link href="/integrations" className="text-[#0a84ff] hover:underline">
                      Integrations
                    </Link>
                    <Link href="/docs/product" className="text-[#0a84ff] hover:underline">
                      Product help
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>,
    document.body
  );
}
