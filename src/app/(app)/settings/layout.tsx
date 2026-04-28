import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="settings-route5-high-contrast isolate min-h-full bg-[#070a0e] text-white [--r5-text-primary:#ffffff] [--r5-text-secondary:rgba(255,255,255,0.92)] [--r5-text-tertiary:rgba(255,255,255,0.82)] [--r5-border-subtle:rgba(255,255,255,0.14)] [--workspace-fg:#ffffff] [--workspace-muted-fg:rgba(250,253,251,0.9)] [--workspace-border:rgba(255,255,255,0.14)] [--workspace-canvas:#0c0f14] [--workspace-surface:#121820] [--workspace-nav-hover:rgba(255,255,255,0.08)] [--workspace-accent:#5eead4] [--workspace-on-accent:#041210]"
    >
      {children}
    </div>
  );
}
