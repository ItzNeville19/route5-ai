import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import WorkspaceOrProductBackLink from "@/components/navigation/WorkspaceOrProductBackLink";

export const metadata: Metadata = {
  title: "Guides — Route5",
  description: "Plain-English guides for leaders and teams — start with the executive brief.",
};

const featured = {
  href: "/docs/product",
  title: "What we ship",
  desc: "Read this first — what works in the app today versus ideas on the roadmap.",
};

const guides: { href: string; title: string; desc: string }[] = [
  {
    href: "/docs/boundaries",
    title: "What we do not do (yet)",
    desc: "So expectations stay realistic — no surprise promises.",
  },
  {
    href: "/docs/roadmap",
    title: "Roadmap",
    desc: "Directions we may build next. Nothing here is sold as finished until it ships.",
  },
];

const legal: { href: string; title: string; desc: string }[] = [
  {
    href: "/docs/privacy",
    title: "Privacy (workspace)",
    desc: "Short summary plus a link to the full policy.",
  },
  {
    href: "/docs/terms",
    title: "Terms (workspace)",
    desc: "Short summary plus a link to the full terms.",
  },
];

export default function DocsIndexPage() {
  return (
    <div className="mx-auto max-w-[720px] pb-20">
      <WorkspaceOrProductBackLink signedInHref="/overview" signedInLabel="Workspace" />
      <h1 className="mt-8 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[var(--workspace-fg)] sm:text-[32px]">
        Guides
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
        Plain-English pages you can share with a leader or a client — no training manual required.
      </p>

      <Link
        href={featured.href}
        className="mt-10 block rounded-2xl border border-[var(--workspace-accent)]/35 bg-[var(--workspace-accent)]/[0.08] p-5 shadow-[0_0_40px_-18px_rgba(139,92,246,0.45)] transition hover:border-[var(--workspace-accent)]/55 hover:bg-[var(--workspace-accent)]/[0.12] sm:p-6"
      >
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-accent)]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Start here
        </p>
        <p className="mt-3 text-[18px] font-semibold text-[var(--workspace-fg)]">{featured.title}</p>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">{featured.desc}</p>
        <p className="mt-4 text-[13px] font-semibold text-[var(--workspace-accent)]">Open guide →</p>
      </Link>

      <h2 className="mt-14 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
        Product
      </h2>
      <ul className="mt-4 divide-y divide-[var(--workspace-border)] rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]">
        {guides.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="block px-5 py-4 transition hover:bg-[var(--workspace-canvas)] sm:px-6 sm:py-5"
            >
              <p className="text-[16px] font-medium text-[var(--workspace-fg)]">{p.title}</p>
              <p className="mt-1 text-[14px] leading-snug text-[var(--workspace-muted-fg)]">{p.desc}</p>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-12 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
        Legal
      </h2>
      <ul className="mt-4 divide-y divide-[var(--workspace-border)] rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]">
        {legal.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="block px-5 py-4 transition hover:bg-[var(--workspace-canvas)] sm:px-6 sm:py-5"
            >
              <p className="text-[16px] font-medium text-[var(--workspace-fg)]">{p.title}</p>
              <p className="mt-1 text-[14px] leading-snug text-[var(--workspace-muted-fg)]">{p.desc}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
