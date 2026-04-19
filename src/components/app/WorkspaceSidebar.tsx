"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { route5ClerkAppearance } from "@/lib/clerk-appearance";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CreditCard,
  FileBarChart,
  FolderOpen,
  Gauge,
  Keyboard,
  LayoutGrid,
  LifeBuoy,
  LineChart,
  ListChecks,
  MessageSquare,
  Palette,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { Route5WordmarkLink } from "@/components/brand/Route5BrandMark";
import { useI18n } from "@/components/i18n/I18nProvider";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
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
      <button type="button" title={label} onClick={onClick} className={`${base} ${state}`}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={href!} title={label} className={`${base} ${state}`}>
      {inner}
    </Link>
  );
}

export default function WorkspaceSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { entitlements } = useWorkspaceData();
  const { t } = useI18n();
  const path = pathname ?? "";
  const displayName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "Account";

  return (
    <aside
      data-route5-sidebar="desktop"
      className="agent-sidebar relative z-40 hidden h-dvh min-h-0 w-[var(--r5-sidebar-width)] max-h-dvh shrink-0 flex-col overflow-hidden border-r border-r5-border-subtle bg-r5-surface-primary/95 backdrop-blur-2xl [@media(pointer:fine)]:sticky [@media(pointer:fine)]:top-0 [@media(pointer:fine)]:flex [@media(pointer:fine)]:self-start md:sticky md:top-0 md:flex md:self-start"
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
              href="/feed"
              active={path === "/feed"}
              icon={ListChecks}
              label={t("sidebar.feed")}
            />
            <NavRow
              href="/desk"
              active={path === "/desk"}
              icon={LayoutGrid}
              label={t("sidebar.desk")}
            />
            <NavRow
              href="/projects"
              active={path === "/projects" || path.startsWith("/projects/")}
              icon={FolderOpen}
              label={t("sidebar.projects")}
            />
            <NavRow
              active={path === "/workspace/chat"}
              icon={MessageSquare}
              label="Chat"
              onClick={() => window.dispatchEvent(new Event("route5:chat-open"))}
            />
            <button
              type="button"
              title="Create a new project"
              onClick={() => window.dispatchEvent(new Event("route5:new-project-open"))}
              className="flex w-full min-h-[var(--r5-nav-item-height)] items-center justify-center gap-[var(--r5-gap-icon-label)] rounded-[var(--r5-radius-card)] border border-dashed border-r5-border-subtle bg-transparent px-[var(--r5-space-3)] text-[length:var(--r5-font-body)] font-[var(--r5-font-weight-regular)] text-r5-text-primary transition-[background-color,border-color] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:border-r5-text-tertiary hover:bg-r5-surface-hover"
            >
              <Plus
                className="h-[length:var(--r5-icon-nav)] w-[length:var(--r5-icon-nav)] shrink-0 opacity-90"
                strokeWidth={2}
                aria-hidden
              />
              <span>{t("sidebar.newProject")}</span>
            </button>
          </div>

          <div className="mt-1 space-y-[var(--r5-space-1)]">
            <NavSectionTitle>{t("sidebar.sectionOps")}</NavSectionTitle>
            <NavRow
              href="/leadership"
              active={path === "/overview" || path === "/leadership"}
              icon={BarChart3}
              label={t("sidebar.leadership")}
            />
            <NavRow
              href="/workspace/dashboard"
              active={path === "/workspace/dashboard"}
              icon={Gauge}
              label={t("sidebar.execution")}
            />
            <NavRow
              href="/team-insights"
              active={path === "/team-insights"}
              icon={LineChart}
              label={t("sidebar.teamInsights")}
            />
            <NavRow
              href="/reports"
              active={path === "/reports"}
              icon={FileBarChart}
              label={t("sidebar.reports")}
            />
            <NavRow
              href="/workspace/escalations"
              active={path.startsWith("/workspace/escalations")}
              icon={AlertTriangle}
              label={t("sidebar.escalations")}
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
            <NavRow
              href="/workspace/customize"
              active={path === "/workspace/customize"}
              icon={Palette}
              label={t("sidebar.customize")}
            />
            <NavRow
              href="/workspace/help"
              active={path === "/workspace/help"}
              icon={LifeBuoy}
              label="Help"
            />
            <NavRow
              href="/settings"
              active={path === "/settings"}
              icon={Settings}
              label={t("sidebar.settings")}
            />
            <NavRow
              href="/workspace/billing"
              active={path.startsWith("/workspace/billing")}
              icon={CreditCard}
              label="Billing"
            />
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
