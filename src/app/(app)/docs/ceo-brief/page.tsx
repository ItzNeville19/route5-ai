import type { Metadata } from "next";
import Link from "next/link";
import { WorkspaceArticle } from "@/components/workspace/WorkspaceArticle";
import { CEO_BRIEF } from "@/lib/ceo-brief";
import { DEFAULT_PILOT_METRICS } from "@/lib/pilot-metrics";

export const metadata: Metadata = {
  title: "Executive brief — Route5",
  description: "Plain-language overview for leaders: what Route5 does, what it does not do, and how to pilot.",
};

/** Renders `**bold**` spans in brief copy as <strong>. */
function BriefBody({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let rest = text;
  let k = 0;
  while (rest.length > 0) {
    const open = rest.indexOf("**");
    if (open === -1) {
      out.push(rest);
      break;
    }
    if (open > 0) out.push(rest.slice(0, open));
    const close = rest.indexOf("**", open + 2);
    if (close === -1) {
      out.push(rest.slice(open));
      break;
    }
    out.push(
      <strong key={k++} className="font-semibold text-[var(--workspace-fg)]">
        {rest.slice(open + 2, close)}
      </strong>
    );
    rest = rest.slice(close + 2);
  }
  return <p className="mt-3 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">{out}</p>;
}

export default function CeoBriefPage() {
  return (
    <WorkspaceArticle
      backHref="/docs"
      backLabel="Guides"
      kicker="Guides"
      title={CEO_BRIEF.title}
      intro={CEO_BRIEF.subtitle}
    >
      {CEO_BRIEF.sections.map((s) => (
        <section key={s.heading}>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-fg)]">
            {s.heading}
          </h2>
          <BriefBody text={s.body} />
        </section>
      ))}

      <section className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5 sm:p-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-fg)]">
          Pick one pilot metric
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Choose <strong className="font-semibold text-[var(--workspace-fg)]">one</strong> measure for a 30-day trial —
          examples below. Same list lives under{" "}
          <Link href="/docs/sales-playbook#pilot-metrics" className="font-medium text-[var(--workspace-accent)] hover:underline">
            Guides → Pilot &amp; discovery
          </Link>
          .
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
          {DEFAULT_PILOT_METRICS.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/30 p-5 sm:p-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-fg)]">
          Asking a senior contact for intros
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Use the <strong className="font-semibold text-[var(--workspace-fg)]">language check</strong> and{" "}
          <strong className="font-semibold text-[var(--workspace-fg)]">warm intro script</strong> on{" "}
          <Link href="/docs/sales-playbook#language-check" className="font-medium text-[var(--workspace-accent)] hover:underline">
            Pilot &amp; discovery
          </Link>{" "}
          — aimed at ops and account leads, not the CEO as the daily user.
        </p>
      </section>
    </WorkspaceArticle>
  );
}
