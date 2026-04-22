"use client";

import WorkspaceChatPanel from "@/components/chat/WorkspaceChatPanel";

export default function WorkspaceChatRoutePage() {
  return (
    <section className="mx-auto w-full max-w-[1400px]">
      <WorkspaceChatPanel defaultOpen />
    </section>
  );
}
