import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Keyboard, LifeBuoy, PlayCircle, Search, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Help — Route5",
  description: "Tutorials, keyboard shortcuts, and where to find every workspace surface.",
};

const cards = [
  {
    title: "Interactive onboarding",
    body: "Organization name, interactive tour, live theme previews, and a guided path to Desk. Replay anytime.",
    href: "/onboarding?replay=1",
    icon: PlayCircle,
    cta: "Replay tutorial",
  },
  {
    title: "Command palette",
    body: "Desk, Leadership (Overview), Marketplace, themes, and dev tools — press ⌘K from anywhere in the app.",
    href: "/desk",
    icon: Search,
    cta: "Open app (then ⌘K)",
  },
  {
    title: "Keyboard shortcuts",
    body: "⌘K palette · ⌘J Capture · / focuses commitment search on Desk. More shortcuts ship with each surface.",
    href: "/docs/product",
    icon: Keyboard,
    cta: "Product docs",
  },
  {
    title: "Integrations",
    body: "Live connectors, paste flows, and OAuth where available — same route the onboarding step opens.",
    href: "/integrations",
    icon: BookOpen,
    cta: "Open Integrations",
  },
  {
    title: "Organization",
    body: "Clerk organization switcher plus everyone who currently owns a commitment — real people from your workspace data.",
    href: "/workspace/organization",
    icon: Users,
    cta: "Open Organization",
  },
] as const;

export default function WorkspaceHelpPage() {
  return (
    <div className="mx-auto w-full max-w-[880px] space-y-[var(--r5-space-6)] pb-[var(--r5-space-8)]">
      <header className="space-y-[var(--r5-space-2)]">
        <div className="flex items-center gap-2 text-r5-accent">
          <LifeBuoy className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Help center</span>
        </div>
        <h1 className="text-[length:var(--r5-font-heading)] font-semibold tracking-tight text-r5-text-primary">
          Learn Route5 in order
        </h1>
        <p className="max-w-2xl text-[length:var(--r5-font-subheading)] leading-relaxed text-r5-text-secondary">
          The sidebar stays minimal on purpose: Desk, Projects, and account. Everything else — Overview,
          Marketplace, customization — is one search away with ⌘K, so your team isn’t buried in links.
        </p>
      </header>

      <ul className="grid gap-[var(--r5-space-4)] sm:grid-cols-2">
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="flex h-full flex-col rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/30 p-[var(--r5-space-4)] shadow-[var(--r5-shadow-elevated)] transition-[transform,box-shadow,border-color] duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:-translate-y-0.5 hover:border-r5-accent/25"
            >
              <c.icon className="h-5 w-5 text-r5-accent" strokeWidth={1.75} aria-hidden />
              <h2 className="mt-3 text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">
                {c.title}
              </h2>
              <p className="mt-2 flex-1 text-[length:var(--r5-font-body)] leading-relaxed text-r5-text-secondary">
                {c.body}
              </p>
              <span className="mt-4 text-[length:var(--r5-font-body)] font-medium text-r5-accent">{c.cta} →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
