"use client";

import { useEffect, useState } from "react";
import { Database, Radio } from "lucide-react";

type PersistencePayload = {
  serviceConfigured: boolean;
  anonConfigured: boolean;
  deploymentNeedsSupabase: boolean;
  realtimeReady: boolean;
};

export default function WorkspacePersistenceBanner() {
  const [state, setState] = useState<PersistencePayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/workspace/persistence", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as PersistencePayload;
        if (!cancelled) setState(data);
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null;

  if (state.deploymentNeedsSupabase) {
    return (
      <div className="border-b border-red-500/30 bg-red-950/40 px-4 py-2.5 text-[13px] text-red-100">
        <div className="mx-auto flex max-w-[min(100%,1440px)] flex-col gap-2 sm:flex-row sm:items-start sm:gap-4 sm:px-8">
          <div className="flex min-w-0 items-start gap-2">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden />
            <div className="min-w-0 space-y-1">
              <p className="font-semibold text-red-50">Workspace data is not saving on this server</p>
              <p className="text-[13px] leading-relaxed text-red-100/90">
                This deployment runs on Vercel without a database connection. Add Supabase environment
                variables in Vercel (Project → Settings → Environment Variables), redeploy, and run SQL
                migrations from <code className="rounded bg-black/20 px-1 py-0.5">supabase/migrations</code>{" "}
                on your Supabase project.
              </p>
              <ul className="list-inside list-disc text-[12px] text-red-100/85">
                <li>
                  <code className="rounded bg-black/20 px-1">NEXT_PUBLIC_SUPABASE_URL</code> — Supabase
                  project URL
                </li>
                <li>
                  <code className="rounded bg-black/20 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — service
                  role JWT (server only), not the anon key
                </li>
                <li>
                  <code className="rounded bg-black/20 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — for
                  chat realtime in the browser
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.serviceConfigured && !state.anonConfigured) {
    return (
      <div className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-2 text-[13px] text-amber-100">
        <div className="mx-auto flex max-w-[min(100%,1440px)] flex-wrap items-center gap-2 sm:px-8">
          <Radio className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          <span className="font-medium">Chat live updates limited</span>
          <span className="text-amber-100/90">
            Add <code className="rounded bg-black/15 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> next to
            your public Supabase URL so unread badges refresh instantly. Messages still save via the API.
          </span>
        </div>
      </div>
    );
  }

  return null;
}
