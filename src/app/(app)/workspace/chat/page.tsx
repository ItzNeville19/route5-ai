"use client";

import { useEffect } from "react";
import { MessageSquare } from "lucide-react";

export default function WorkspaceChatRoutePage() {
  useEffect(() => {
    window.dispatchEvent(new Event("route5:chat-open"));
  }, []);

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-r5-border-subtle bg-r5-surface-secondary/40 px-6 py-14 text-center">
      <MessageSquare className="h-7 w-7 text-r5-text-secondary" aria-hidden />
      <h1 className="mt-4 text-lg font-semibold text-r5-text-primary">Chat opened</h1>
      <p className="mt-2 text-sm text-r5-text-secondary">
        Use the team chat panel on the right to continue direct and project conversations.
      </p>
    </section>
  );
}
