import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentation — Route5",
  description: "Product scope, roadmap, boundaries, and legal — in your workspace.",
};

const pages: { href: string; title: string; desc: string }[] = [
  {
    href: "/docs/product",
    title: "What we ship",
    desc: "Live product surface vs roadmap — the briefing you can share internally.",
  },
  {
    href: "/docs/roadmap",
    title: "Roadmap",
    desc: "Directions we may pursue. Nothing here is sold as shipped until it ships.",
  },
  {
    href: "/docs/boundaries",
    title: "Boundaries",
    desc: "What Route5 does not do today — so expectations stay accurate.",
  },
  {
    href: "/docs/privacy",
    title: "Privacy",
    desc: "Data handling in this workspace, with a link to the full public policy.",
  },
  {
    href: "/docs/terms",
    title: "Terms",
    desc: "Terms of use for workspace access, with a link to the full public terms.",
  },
];

export default function DocsIndexPage() {
  return (
    <div className="mx-auto max-w-[720px] pb-20">
      <Link
        href="/projects"
        className="inline-flex text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
      >
        ← Workspace
      </Link>
      <h1 className="mt-8 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[var(--workspace-fg)] sm:text-[32px]">
        Documentation
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
        Each topic has its own page — nothing here is a dead hash link.
      </p>
      <ul className="mt-12 divide-y divide-[var(--workspace-border)] rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]">
        {pages.map((p) => (
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
