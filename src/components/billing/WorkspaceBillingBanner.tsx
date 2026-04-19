"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

export default function WorkspaceBillingBanner() {
  const [banner, setBanner] = useState<null | {
    kind: "payment";
    title: string;
    message: string;
    href: string;
    cta: string;
  }>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/billing/state", { credentials: "same-origin" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          paymentIssue?: boolean;
        };
        if (data.paymentIssue) {
          setBanner({
            kind: "payment",
            title: "Payment issue",
            message:
              "We couldn't process your subscription payment. Update your card in Billing to avoid losing access.",
            href: "/workspace/billing",
            cta: "Open billing",
          });
          return;
        }
        setBanner(null);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!banner) return null;

  return (
    <div
      className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-[13px] text-amber-100"
    >
      <div className="mx-auto flex max-w-[min(100%,1440px)] flex-wrap items-center gap-2 sm:px-8">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
        <span className="font-medium">{banner.title}</span>
        <span className="text-amber-100/90">{banner.message}</span>
        <Link
          href={banner.href}
          className="ml-auto font-semibold text-amber-200 underline-offset-2 hover:underline"
        >
          {banner.cta}
        </Link>
      </div>
    </div>
  );
}
