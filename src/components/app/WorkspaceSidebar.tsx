"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { route5ClerkAppearance } from "@/lib/clerk-appearance";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Keyboard,
  LifeBuoy,
  LayoutGrid,
  Home,
  Palette,
  Settings,
} from "lucide-react";
import { Route5WordmarkLink } from "@/components/brand/Route5BrandMark";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { ROUTE5_SIGNATURE } from "@/lib/brand-signature";

const tierLabel =
  process.env.NEXT_PUBLIC_WORKSPACE_TIER_PRIMARY?.trim() || "Pro";

function NavSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-[var(--r5-space-2)] pb-1 pt-3 text-[10px] font-[var(--r5-font-weight-semibold)] tracking-[0.08em] text-r5-text-tertiary first:pt-1">
      {children}
    </p>
  );
}

function NavRow({
  href,
  active,
  icon: Icon,
  label,
  onClick,
}: {
  href?: string;
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  const base =
    "flex w-full min-h-[34px] items-center gap-[var(--r5-gap-icon-label)] rounded-xl px-[var(--r5-space-2)] text-[13px] font-[var(--r5-font-weight-medium)] leading-none transition-[background-color,color,box-shadow,border-color] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)]";
  const state = active
    ? "border border-r5-border-subtle bg-r5-surface-secondary text-r5-text-primary shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
    : "border border-transparent text-r5-text-secondary hover:border-r5-border-subtle hover:bg-r5-surface-hover hover:text-r5-text-primary";

  const inner = (
    <>
      <Icon
        className={active ? "shrink-0 text-r5-text-primary" : "shrink-0 text-r5-text-secondary"}
        style={{ width: "var(--r5-icon-nav)", height: "var(--r5-icon-nav)" }}
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        title={label}
        aria-current={active ? "page" : undefined}
        onClick={onClick}
        className={`${base} ${state}`}
      >
        {inner}
      </button>
    );
  }
  return (
    <Link
      href={href!}
      title={label}
      aria-current={active ? "page" : undefined}
      className={`${base} ${state}`}
    >
      {inner}
    </Link>
  );
}

export default function WorkspaceSidebar() {
  const pathname = usePathname();
  const { entitlements } = useWorkspaceData();
  const { user } = useUser();
  const { t } = useI18n();
  const path = pathname ?? "";
  const displayName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "Account";

  return (
    <aside
      data-route5-sidebar="desktop"
      className="route5-brand-sidebar-edge agent-sidebar relative z-40 hidden h-dvh min-h-0 w-[var(--r5-sidebar-width)] max-h-dvh shrink-0 flex-col overflow-hidden border-r border-r5-border-subtle bg-r5-surface-primary/98 backdrop-blur-2xl [@media(pointer:fine)]:sticky [@media(pointer:fine)]:top-0 [@media(pointer:fine)]:flex [@media(pointer:fine)]:self-start md:sticky md:top-0 md:flex md:self-start"
      aria-label={t("sidebar.navAria")}
    >
      <div className="shrink-0 border-b border-r5-border-subtle px-[var(--r5-space-3)] pb-[var(--r5-space-2)] pt-[var(--r5-space-3)]">
        <div className="flex items-start justify-between gap-[var(--r5-space-2)]">
          <div className="min-w-0 flex-1">
            <Route5WordmarkLink className="truncate" />
            <p className="mt-[var(--r5-space-1)] line-clamp-1 text-[10px] font-[var(--r5-font-weight-semibold)] tracking-[0.05em] text-r5-text-tertiary">
              {ROUTE5_SIGNATURE.tagline}
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <nav
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-[var(--r5-space-3)] pb-[var(--r5-space-3)] pt-[var(--r5-space-2)]"
          aria-label={t("sidebar.navAria")}
        >
          <div className="mb-2 rounded-xl border border-r5-border-subtle bg-r5-surface-secondary/65 px-2.5 py-1.5">
            <p className="text-[10px] font-semibold tracking-[0.1em] text-r5-text-secondary">
              Workspace
            </p>
          </div>
          <div className="space-y-[var(--r5-space-1)]">
            <NavRow href="/overview" active={path === "/overview"} icon={Home} label="Home" />
            <NavRow
              href="/desk"
              active={path === "/desk" || path === "/feed"}
              icon={LayoutGrid}
              label="Desk"
            />
          </div>

          <div className="my-[var(--r5-space-3)] h-px bg-r5-border-subtle" role="separator" aria-hidden />

          <div className="space-y-[var(--r5-space-1)]">
            <NavSectionTitle>Utilities</NavSectionTitle>
            <NavRow
              active={false}
              icon={Bell}
              label="Notifications"
              onClick={() => window.dispatchEvent(new Event("route5:notifications-open"))}
            />
            <NavRow
              href="/settings"
              active={path === "/settings"}
              icon={Settings}
              label="Settings"
            />
            <NavRow
              href="/workspace/customize"
              active={path === "/workspace/customize"}
              icon={Palette}
              label="Customize"
            />
            <NavRow href="/workspace/help" active={path === "/workspace/help"} icon={LifeBuoy} label="Help" />
            <NavRow
              active={false}
              icon={Keyboard}
              label={t("sidebar.shortcuts")}
              onClick={() => window.dispatchEvent(new Event("route5:shortcuts-open"))}
            />
          </div>
        </nav>
      </div>

      <div className="shrink-0 border-t border-r5-border-subtle bg-r5-surface-primary/90 px-[var(--r5-space-3)] py-[var(--r5-space-3)] backdrop-blur-xl">
        <div className="flex items-center gap-[var(--r5-space-3)] rounded-[var(--r5-radius-card)] border border-r5-border-subtle bg-r5-surface-secondary/60 p-[var(--r5-space-3)] shadow-[var(--r5-shadow-elevated)]">
          <UserButton
            userProfileMode="navigation"
            userProfileUrl="/settings"
            appearance={{
              ...route5ClerkAppearance,
              elements: {
                ...route5ClerkAppearance.elements,
                avatarBox: "h-9 w-9 overflow-hidden rounded-full ring-1 ring-[var(--r5-border-subtle)]",
                userButtonAvatarImage: "h-full w-full object-cover",
                userButtonPopoverCard:
                  "border border-white/10 bg-[#0a0a0a] text-[#fafafa] shadow-2xl",
              },
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[length:var(--r5-font-body)] font-[var(--r5-font-weight-semibold)] leading-tight text-r5-text-primary">
              {displayName}
            </p>
            <p className="mt-[var(--r5-space-1)] text-[10px] font-[var(--r5-font-weight-regular)] text-r5-text-tertiary">
              {entitlements?.tierLabel ?? tierLabel}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
