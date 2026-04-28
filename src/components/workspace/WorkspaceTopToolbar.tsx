"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ComponentType } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  Bell,
  Bot,
  CircleHelp,
  Eye,
  History,
  Home,
  Settings2,
  Shield,
  UserRound,
} from "lucide-react";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

type WorkspaceViewMode = "admin" | "employee";

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function useViewMode(): [WorkspaceViewMode, (next: WorkspaceViewMode) => void] {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const { orgRole } = useWorkspaceData();
  const defaultMode: WorkspaceViewMode = orgRole === "admin" || orgRole === "manager" ? "admin" : "employee";
  const mode = search.get("view") === "employee" ? "employee" : defaultMode;

  const setMode = (next: WorkspaceViewMode) => {
    const params = new URLSearchParams(search.toString());
    params.set("view", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return [mode, setMode];
}

type ToolbarItem = {
  id: string;
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export default function WorkspaceTopToolbar() {
  const pathnameRaw = usePathname();
  const pathname = pathnameRaw?.split("?")[0] ?? "";
  const search = useSearchParams();
  const { orgRole } = useWorkspaceData();
  const [mode, setMode] = useViewMode();
  const canSwitchAdmin = orgRole === "admin" || orgRole === "manager";

  const suffix = useMemo(() => {
    const params = new URLSearchParams(search.toString());
    if (!params.get("view")) params.set("view", mode);
    const text = params.toString();
    return text ? `?${text}` : "";
  }, [search, mode]);

  const items: ToolbarItem[] = [
    { id: "dashboard", href: `/workspace/dashboard${suffix}`, label: "Home", icon: Home },
    { id: "queue", href: `/workspace/agent${suffix}`, label: "Queue", icon: Bot },
    { id: "activity", href: `/workspace/activity${suffix}`, label: "Activity", icon: History },
    { id: "preview", href: `/workspace/preview`, label: "Preview", icon: Eye },
    { id: "notifications", href: "/workspace/notifications", label: "Alerts", icon: Bell },
    { id: "settings", href: "/settings", label: "System", icon: Settings2 },
    { id: "help", href: "/workspace/help", label: "Help", icon: CircleHelp },
  ];

  return (
    <header className="sticky top-0 z-30 mb-3">
      <div className="rounded-[20px] border border-[#2a3f2d] bg-[linear-gradient(180deg,rgba(10,16,12,0.95),rgba(10,16,12,0.78))] px-3 py-2 shadow-[0_20px_80px_-50px_rgba(13,192,101,0.5),inset_0_1px_0_rgba(140,255,177,0.12)] backdrop-blur-xl">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2d5341] bg-[radial-gradient(circle_at_30%_25%,#1df18d_0%,#0d4f2e_42%,#0d1710_100%)] text-[20px] font-semibold text-white"
              title="Route5"
            >
              ∞
            </div>
            <div className="hidden text-[13px] font-medium text-[#c8d6c7] sm:block">Route5 Operating System</div>
          </div>

          <nav className="flex max-w-[min(100%,560px)] items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-w-none">
            {items.map((item) => {
              const itemBase = item.href.split("?")[0];
              const active =
                pathname === itemBase || (itemBase !== "/" && pathname.startsWith(`${itemBase}/`));
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  title={item.label}
                  className={classNames(
                    "route5-nav-row inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium",
                    active
                      ? "border-[#3d8f59] bg-[#1b3f2a] text-white shadow-[0_0_0_1px_rgba(85,209,131,0.22)]"
                      : "border-[#2b4130] bg-[#121c14]/90 text-[#b7c8b5] hover:border-[#416447] hover:bg-[#17231a]"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-[#2d4c31] bg-[#0f1a11] p-1">
              <button
                type="button"
                onClick={() => setMode("admin")}
                disabled={!canSwitchAdmin}
                className={classNames(
                  "route5-pressable rounded-full px-2.5 py-1 text-[11px] font-medium",
                  mode === "admin" ? "bg-[#1f6d36] text-white" : "text-[#a9bda7]",
                  !canSwitchAdmin && "cursor-not-allowed opacity-40"
                )}
                title="Admin View"
              >
                <span className="inline-flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Admin
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("employee")}
                className={classNames(
                  "route5-pressable rounded-full px-2.5 py-1 text-[11px] font-medium",
                  mode === "employee" ? "bg-[#1f6d36] text-white" : "text-[#a9bda7]"
                )}
                title="Employee Preview"
              >
                <span className="inline-flex items-center gap-1">
                  <UserRound className="h-3 w-3" />
                  Employee
                </span>
              </button>
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2d4f35] bg-[#122015]">
              <UserButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
