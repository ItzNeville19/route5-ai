"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Registers the app service worker (PWA) and exposes Install when the browser offers it.
 */
export default function WorkspaceInstallControls() {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        /* non-fatal — e.g. localhost HTTP quirks */
      });

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return (
    <div className="space-y-1.5">
      {!installed && deferred ? (
        <button
          type="button"
          onClick={() => void install()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/60 px-2.5 py-2 text-left text-[11px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35 hover:bg-[var(--workspace-nav-hover)]"
        >
          <Download className="h-3.5 w-3.5 shrink-0 text-[var(--workspace-accent)]" aria-hidden />
          <span>{t("sidebar.installApp")}</span>
        </button>
      ) : null}
      <Link
        href="/download"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-center text-[10px] font-medium text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
      >
        <Download className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        <span>{t("sidebar.downloadSecurity")}</span>
      </Link>
    </div>
  );
}
