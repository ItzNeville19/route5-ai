import type { ReactNode } from "react";

/** Inherit workspace theme from the shell (gradients, `--workspace-*`). Section cards use their own dark surfaces. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <div className="isolate min-h-full">{children}</div>;
}
