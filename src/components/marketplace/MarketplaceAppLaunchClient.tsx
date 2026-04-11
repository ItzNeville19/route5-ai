"use client";

import { useCallback, useEffect, useState } from "react";
import MarketplaceAppLaunchScreen from "@/components/marketplace/MarketplaceAppLaunchScreen";
import type { MarketplaceApp } from "@/lib/marketplace-catalog";

type Health = {
  storageBackend?: "supabase" | "sqlite";
  storageReady?: boolean;
  extractionMode?: "ai" | "offline";
};

export default function MarketplaceAppLaunchClient({
  app,
}: {
  app: MarketplaceApp;
}) {
  const [health, setHealth] = useState<Health | null>(null);

  const load = useCallback(async () => {
    if (app.kind !== "stack") return;
    try {
      const res = await fetch("/api/health", { credentials: "same-origin" });
      if (res.ok) setHealth((await res.json()) as Health);
    } catch {
      setHealth({});
    }
  }, [app.kind]);

  useEffect(() => {
    void load();
  }, [load]);

  return <MarketplaceAppLaunchScreen app={app} health={health} />;
}
