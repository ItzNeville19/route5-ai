"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import {
  X,
  ListChecks,
  LayoutGrid,
  FolderOpen,
  MessageSquare,
  BarChart3,
  Gauge,
  LineChart,
  FileBarChart,
  AlertTriangle,
  Users,
  Palette,
  LifeBuoy,
  Settings,
  CreditCard,
} from "lucide-react";
import { route5ClerkAppearance } from "@/lib/clerk-appearance";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

const tierLabel =
  process.env.NEXT_PUBLIC_WORKSPACE_TIER_PRIMARY?.trim() || "Pro";

type WorkspaceMobileSidebarProps = {
  open: boolean;
  onClose: () => void;
};

const NAV_SECTIONS = [
  {
    title: "Work",
    items: [
      { href: "/feed", label: "Feed", icon: ListChecks },
      { href: "/desk", label: "Capture", icon: LayoutGrid },
      { href: "/projects", label: "Projects", icon: FolderOpen },
      { href: "/workspace/chat", label: "Chat", icon: MessageSquare },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/leadership", label: "Leadership", icon: BarChart3 },
      { href: "/workspace/dashboard", label: "Execution", icon: Gauge },
      { href: "/team-insights", label: "Team insights", icon: LineChart },
      { href: "/reports", label: "Reports", icon: FileBarChart },
      { href: "/workspace/escalations", label: "Escalations", icon: AlertTriangle },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/workspace/organization", label: "Organization", icon: Users },
      { href: "/workspace/customize", label: "Customize", icon: Palette },
      { href: "/workspace/help", label: "Help", icon: LifeBuoy },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/workspace/billing", label: "Billing", icon: CreditCard },
    ],
  },
] as const;

export default function WorkspaceMobileSidebar({ open, onClose }: WorkspaceMobileSidebarProps) {
  const pathname = usePathname() ?? "";
  const { user } = useUser();
  const { entitlements } = useWorkspaceData();
  const displayName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "Account";

  return (
    <div
      className={`fixed inset-0 z-[70] md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute inset-y-0 left-0 flex w-[86vw] max-w-[320px] flex-col border-r border-r5-border-subtle bg-r5-surface-primary/98 shadow-2xl backdrop-blur-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-r5-border-subtle px-4 py-3">
          <p className="text-sm font-semibold text-r5-text-primary">Route5</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-r5-border-subtle text-r5-text-secondary"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-r5-text-tertiary">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    (item.href === "/projects" && pathname.startsWith("/projects/")) ||
                    (item.href === "/workspace/escalations" && pathname.startsWith("/workspace/escalations"));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] ${
                        active
                          ? "bg-r5-surface-secondary text-r5-text-primary"
                          : "text-r5-text-secondary hover:bg-r5-surface-hover hover:text-r5-text-primary"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-r5-border-subtle bg-r5-surface-primary/90 px-3 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3 rounded-[var(--r5-radius-card)] border border-r5-border-subtle bg-r5-surface-secondary/60 p-3 shadow-[var(--r5-shadow-elevated)]">
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
    </div>
  );
}
