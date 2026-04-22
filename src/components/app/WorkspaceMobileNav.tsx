"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, ListChecks, MessageSquare, Plus, Settings } from "lucide-react";
import { useCapture } from "@/components/capture/CaptureProvider";

function LinkTab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof ListChecks;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-[var(--r5-space-1)] rounded-[var(--r5-radius-card)] py-[var(--r5-space-2)] text-[length:var(--r5-font-kbd)] font-[var(--r5-font-weight-regular)] leading-none transition-[background-color,color] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] ${
        active ? "bg-r5-surface-secondary text-r5-text-primary" : "text-r5-text-tertiary hover:bg-r5-surface-hover hover:text-r5-text-primary"
      }`}
    >
      <Icon style={{ width: "var(--r5-icon-nav)", height: "var(--r5-icon-nav)" }} strokeWidth={1.75} aria-hidden />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

export default function WorkspaceMobileNav() {
  const pathname = usePathname() ?? "";
  const path = pathname.split("?")[0] ?? pathname;
  const { open: openCapture, isOpen: captureOpen } = useCapture();

  return (
    <nav
      className="route5-brand-mobile-nav-edge fixed inset-x-0 bottom-0 z-40 flex h-[calc(var(--r5-mobile-nav-height)+env(safe-area-inset-bottom))] items-stretch border-t border-r5-border-subtle bg-r5-surface-primary/95 pb-[max(0px,env(safe-area-inset-bottom))] pt-[var(--r5-space-2)] backdrop-blur-xl md:hidden [@media(pointer:fine)]:hidden"
      aria-label="Primary"
    >
      <LinkTab href="/desk" label="Desk" icon={ListChecks} active={path === "/desk" || path === "/feed"} />
      <button
        type="button"
        onClick={() => openCapture()}
        className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-[var(--r5-space-1)] rounded-[var(--r5-radius-card)] py-[var(--r5-space-2)] text-[length:var(--r5-font-kbd)] font-[var(--r5-font-weight-regular)] leading-none transition-[background-color,color] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] ${
          captureOpen || path === "/capture"
            ? "bg-r5-surface-secondary text-r5-text-primary"
            : "text-r5-text-tertiary hover:bg-r5-surface-hover hover:text-r5-text-primary"
        }`}
      >
        <Plus style={{ width: "var(--r5-icon-nav)", height: "var(--r5-icon-nav)" }} strokeWidth={1.9} aria-hidden />
        <span className="max-w-full truncate">Capture</span>
      </button>
      <LinkTab href="/projects" label="Projects" icon={FolderOpen} active={path === "/projects" || path.startsWith("/projects/")} />
      <LinkTab href="/workspace/chat" label="Threads" icon={MessageSquare} active={path === "/workspace/chat"} />
      <LinkTab href="/settings" label="Settings" icon={Settings} active={path === "/settings"} />
    </nav>
  );
}
