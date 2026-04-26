"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Keyboard, ListChecks, Settings } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

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
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-[var(--r5-space-1)] rounded-[var(--r5-radius-card)] border px-0.5 py-[var(--r5-space-2)] text-[length:var(--r5-font-kbd)] font-[var(--r5-font-weight-medium)] leading-none transition-[background-color,color,box-shadow,border-color] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] ${
        active
          ? "border-r5-border-subtle bg-r5-surface-secondary text-r5-text-primary"
          : "border-transparent text-r5-text-secondary hover:border-r5-border-subtle hover:bg-r5-surface-hover hover:text-r5-text-primary"
      }`}
    >
      <Icon
        className={active ? "text-r5-text-primary" : "text-r5-text-secondary"}
        style={{ width: "var(--r5-icon-nav)", height: "var(--r5-icon-nav)" }}
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

function ShortcutsTab({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex min-w-0 flex-1 flex-col items-center justify-center gap-[var(--r5-space-1)] rounded-[var(--r5-radius-card)] border border-transparent px-0.5 py-[var(--r5-space-2)] text-[length:var(--r5-font-kbd)] font-[var(--r5-font-weight-regular)] leading-none text-r5-text-secondary transition-[background-color,color,border-color] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:border-r5-border-subtle hover:bg-r5-surface-hover hover:text-r5-text-primary"
      aria-label={`${label} — open keyboard shortcuts`}
      onClick={() => window.dispatchEvent(new Event("route5:shortcuts-open"))}
    >
      <Keyboard style={{ width: "var(--r5-icon-nav)", height: "var(--r5-icon-nav)" }} strokeWidth={1.75} aria-hidden />
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}

export default function WorkspaceMobileNav() {
  const pathname = usePathname() ?? "";
  const path = pathname.split("?")[0] ?? pathname;
  const { t } = useI18n();

  return (
    <nav
      className="route5-brand-mobile-nav-edge fixed inset-x-0 bottom-0 z-40 flex h-[calc(var(--r5-mobile-nav-height)+env(safe-area-inset-bottom))] items-stretch border-t border-r5-border-subtle pb-[max(0px,env(safe-area-inset-bottom))] pt-[var(--r5-space-2)] backdrop-blur-xl md:hidden [@media(pointer:fine)]:hidden"
      aria-label="Primary"
    >
      <LinkTab href="/overview" label="Home" icon={BarChart3} active={path === "/overview" || path === "/leadership"} />
      <LinkTab href="/desk" label="Desk" icon={ListChecks} active={path === "/desk" || path === "/feed"} />
      <ShortcutsTab label={t("sidebar.shortcuts")} />
      <LinkTab href="/settings" label="Settings" icon={Settings} active={path === "/settings"} />
    </nav>
  );
}
