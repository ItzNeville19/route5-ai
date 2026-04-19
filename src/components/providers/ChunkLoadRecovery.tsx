"use client";

import { useEffect } from "react";

const RECOVERY_KEY = "route5:chunk-recovery-attempted";

function shouldRecoverFromError(reason: unknown): boolean {
  const text =
    reason instanceof Error
      ? `${reason.name} ${reason.message}`
      : typeof reason === "string"
        ? reason
        : JSON.stringify(reason ?? "");
  const lower = text.toLowerCase();
  return (
    lower.includes("chunkloaderror") ||
    lower.includes("loading chunk") ||
    lower.includes("dynamically imported module") ||
    lower.includes("module script failed")
  );
}

function recoverOnce(): void {
  try {
    if (sessionStorage.getItem(RECOVERY_KEY) === "1") return;
    sessionStorage.setItem(RECOVERY_KEY, "1");
    window.location.reload();
  } catch {
    window.location.reload();
  }
}

export default function ChunkLoadRecovery() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (shouldRecoverFromError(event.error ?? event.message)) {
        recoverOnce();
      }
    };
    const onUnhandled = (event: PromiseRejectionEvent) => {
      if (shouldRecoverFromError(event.reason)) {
        recoverOnce();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandled);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, []);

  return null;
}
