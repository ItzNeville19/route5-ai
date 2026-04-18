"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  LayoutGrid,
  MessageCircle,
  PanelTop,
  Plug2,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { CommandOrbIcon } from "@/components/brand/CommandOrbIcon";
import { useCommandPalette } from "@/components/CommandPalette";
import { MERIDIAN_SHORT } from "@/lib/assistant-brand";
import { deskUrl } from "@/lib/desk-routes";

export default function RelayCommandOrb() {
  const router = useRouter();
  const { open: openPalette } = useCommandPalette();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const openRelay = useCallback(() => {
    window.dispatchEvent(new Event("route5:assistant-open"));
    setOpen(false);
  }, []);

  const goCustomize = useCallback(() => {
    router.push("/workspace/customize");
    setOpen(false);
  }, [router]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-xl border border-white/[0.1] bg-white/[0.05] px-2 py-1.5 text-left transition hover:border-white/[0.16] hover:bg-white/[0.08]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${MERIDIAN_SHORT} and workspace actions`}
      >
        <span className="relative flex shrink-0 items-center justify-center">
          <CommandOrbIcon size="md" />
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full border-2 border-[#09090b] bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-300">
            Command
            <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} />
          </span>
          <span className="block text-[12px] font-semibold leading-tight text-zinc-100">
            {MERIDIAN_SHORT} · Apps · Search
          </span>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-[200] min-w-[220px] overflow-hidden rounded-xl border border-white/[0.1] bg-[#0c0c0f]/95 py-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={openRelay}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] text-zinc-200 transition hover:bg-white/[0.06]"
          >
            <MessageCircle className="h-4 w-4 text-emerald-400" />
            Open {MERIDIAN_SHORT}
          </button>
          <Link
            href="/marketplace"
            role="menuitem"
            className="flex items-center gap-3 px-3 py-2.5 text-[13px] text-zinc-200 transition hover:bg-white/[0.06]"
            onClick={() => setOpen(false)}
          >
            <LayoutGrid className="h-4 w-4 text-indigo-400" />
            App launcher
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={goCustomize}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] text-zinc-200 transition hover:bg-white/[0.06]"
          >
            <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
            Dashboard layout
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              openPalette();
              setOpen(false);
            }}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] text-zinc-200 transition hover:bg-white/[0.06]"
          >
            <Search className="h-4 w-4 text-zinc-400" />
            Search workspace
            <kbd className="ml-auto rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
              ⌘K
            </kbd>
          </button>
          <Link
            href="/settings#connections"
            role="menuitem"
            className="flex items-center gap-3 px-3 py-2.5 text-[13px] text-zinc-200 transition hover:bg-white/[0.06]"
            onClick={() => setOpen(false)}
          >
            <Plug2 className="h-4 w-4 text-zinc-300" />
            Integrations hub
          </Link>
          <Link
            href={deskUrl()}
            role="menuitem"
            className="flex items-center gap-3 px-3 py-2.5 text-[13px] text-zinc-200 transition hover:bg-white/[0.06]"
            onClick={() => setOpen(false)}
          >
            <PanelTop className="h-4 w-4 text-violet-400" />
            Desk
          </Link>
        </div>
      ) : null}
    </div>
  );
}
