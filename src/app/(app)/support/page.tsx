import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support — Route5",
  description: "Get help, sales, or integration priorities from inside the workspace.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-[640px] pb-20">
      <Link
        href="/projects"
        className="inline-flex text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
      >
        ← Projects
      </Link>
      <h1 className="mt-8 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[var(--workspace-fg)] sm:text-[32px]">
        Support
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
        Use the contact form for sales, security reviews, integration priorities, or onboarding
        help. You stay inside Route5 until you choose to open the public site.
      </p>
      <div className="mt-10 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-6">
        <p className="text-[15px] font-medium text-[var(--workspace-fg)]">Contact form</p>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
          The full form runs on our public contact page so submissions work the same for
          workspace and marketing visitors.
        </p>
        <a
          href="/contact"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-[var(--workspace-accent)] px-6 text-[14px] font-semibold text-white transition hover:bg-[var(--workspace-accent-hover)]"
        >
          Open contact form
        </a>
      </div>
      <p className="mt-8 text-[13px] text-[var(--workspace-muted-fg)]">
        Prefer docs first?{" "}
        <Link href="/docs" className="font-medium text-[var(--workspace-accent)] hover:underline">
          Documentation hub
        </Link>
        .
      </p>
    </div>
  );
}
