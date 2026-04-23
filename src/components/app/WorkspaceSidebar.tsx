"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { route5ClerkAppearance } from "@/lib/clerk-appearance";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  CreditCard,
  Keyboard,
  LifeBuoy,
  ListChecks,
  ListTodo,
  Palette,
  Settings,
  Users,
} from "lucide-react";
import { Route5WordmarkLink } from "@/components/brand/Route5BrandMark";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { isNavKeyVisible, type OrgNavKey } from "@/lib/org-ui-policy";
import { ROUTE5_SIGNATURE } from "@/lib/brand-signature";

const tierLabel =
  process.env.NEXT_PUBLIC_WORKSPACE_TIER_PRIMARY?.trim() || "Pro";

function NavSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-[var(--r5-space-3)] pb-1 pt-4 text-[10px] font-[var(--r5-font-weight-semibold)] uppercase tracking-[0.14em] text-r5-text-tertiary first:pt-1">
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
    "flex w-full min-h-[var(--r5-nav-item-height)] items-center gap-[var(--r5-gap-icon-label)] rounded-[var(--r5-radius-card)] px-[var(--r5-space-3)] text-[length:var(--r5-font-body)] font-[var(--r5-font-weight-regular)] leading-none transition-[background-color,color] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)]";
  const state = active
    ? "bg-r5-surface-secondary text-r5-text-primary"
    : "text-r5-text-secondary hover:bg-r5-surface-hover hover:text-r5-text-primary";

  const inner = (
    <>
      <Icon
        className="shrink-0 text-r5-text-secondary"
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
  const { user } = useUser();
  const { entitlements, orgUiPolicy, orgRole } = useWorkspaceData();
  const show = (k: OrgNavKey) => isNavKeyVisible(k, orgUiPolicy, orgRole);
  const { t } = useI18n();
  const path = pathname ?? "";
  const displayName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "Account";

  return (
    <aside
      data-route5-sidebar="desktop"
      className="route5-brand-sidebar-edge agent-sidebar relative z-40 hidden h-dvh min-h-0 w-[var(--r5-sidebar-width)] max-h-dvh shrink-0 flex-col overflow-hidden border-r border-r5-border-subtle bg-r5-surface-primary/95 backdrop-blur-2xl [@media(pointer:fine)]:sticky [@media(pointer:fine)]:top-0 [@media(pointer:fine)]:flex [@media(pointer:fine)]:self-start md:sticky md:top-0 md:flex md:self-start"
      aria-label={t("sidebar.navAria")}
    >
      <div className="shrink-0 px-[var(--r5-space-3)] pb-[var(--r5-space-2)] pt-[var(--r5-space-4)]">
        <div className="flex items-start justify-between gap-[var(--r5-space-2)]">
          <div className="min-w-0 flex-1">
            <Route5WordmarkLink className="truncate" />
            <p className="mt-[var(--r5-space-2)] line-clamp-2 text-[10px] font-[var(--r5-font-weight-semibold)] uppercase tracking-[0.12em] text-r5-text-tertiary">
              {ROUTE5_SIGNATURE.tagline}
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <nav
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-[var(--r5-space-3)] pb-[var(--r5-space-3)]"
          aria-label={t("sidebar.navAria")}
        >
          <div className="space-y-[var(--r5-space-1)]">
            <NavSectionTitle>{t("sidebar.sectionWork")}</NavSectionTitle>
            <NavRow
              href="/overview"
              active={path === "/overview" || path === "/leadership"}
              icon={BarChart3}
              label="Home"
            />
            <NavRow
              href="/desk"
              active={path === "/desk" || path === "/feed"}
              icon={ListChecks}
              label={t("sidebar.desk")}
            />
            <NavRow
              href="/workspace/commitments"
              active={path.startsWith("/workspace/commitments")}
              icon={ListTodo}
              label="Task tracker"
            />
          </div>

          <div className="mt-1 space-y-[var(--r5-space-1)]">
            <NavSectionTitle>{t("sidebar.sectionPeople")}</NavSectionTitle>
            <NavRow
              href="/workspace/organization"
              active={path === "/workspace/team" || path === "/workspace/organization"}
              icon={Users}
              label="Organization"
            />
          </div>

          <div
            className="my-[var(--r5-space-3)] h-px bg-r5-border-subtle"
            role="separator"
            aria-hidden
          />

          <div className="space-y-[var(--r5-space-1)]">
            <NavSectionTitle>{t("sidebar.sectionAccount")}</NavSectionTitle>
            {show("customize") ? (
              <NavRow
                href="/workspace/customize"
                active={path === "/workspace/customize"}
                icon={Palette}
                label={t("sidebar.customize")}
              />
            ) : null}
            {show("help") ? (
              <NavRow
                href="/workspace/help"
                active={path === "/workspace/help"}
                icon={LifeBuoy}
                label="Help"
              />
            ) : null}
            {show("settings") ? (
              <NavRow
                href="/settings"
                active={path === "/settings"}
                icon={Settings}
                label={t("sidebar.settings")}
              />
            ) : null}
            {show("billing") ? (
              <NavRow
                href="/workspace/billing"
                active={path.startsWith("/workspace/billing")}
                icon={CreditCard}
                label="Billing"
              />
            ) : null}
            <NavRow
              active={false}
              icon={Keyboard}
              label="Shortcuts"
              onClick={() => window.dispatchEvent(new Event("route5:shortcuts-open"))}
            />
            <NavRow
              active={false}
              icon={Bell}
              label="Notifications"
              onClick={() => window.dispatchEvent(new Event("route5:notifications-open"))}
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
