import type { Metadata } from "next";
import { WorkspaceArticle } from "@/components/workspace/WorkspaceArticle";
import { INTRO_LANGUAGE_CHECK, WARM_INTRO_SCRIPT } from "@/lib/pilot-metrics";
import Link from "next/link";
import {
  COUNTER_WRAPPER_POINTS,
  DISCOVERY_INTRO,
  DISCOVERY_QUESTIONS,
  EXECUTION_PLAN_30_DAY,
  PILOT_METRIC_EXAMPLES,
  VALIDATION_GATES,
} from "@/lib/sales-discovery";

export const metadata: Metadata = {
  title: "Pilot & discovery — Route5",
  description: "Questions and example metrics for teams validating Route5 with real work.",
};

export default function SalesPlaybookPage() {
  return (
    <WorkspaceArticle
      backHref="/docs"
      backLabel="Guides"
      kicker="Guides"
      title="Pilot & discovery questions"
      intro="Use these in conversations with a team or client. Keep answers in your own notes — or paste into Desk if you want them turned into a structured run."
    >
      <section className="rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5 sm:p-6">
        <p className="text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">{DISCOVERY_INTRO}</p>
      </section>

      <section id="validation-gates" className="scroll-mt-24">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-fg)]">
          Validation gates (before scaling outreach)
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
          You cannot claim demand without evidence — use this as a checklist in your own notes.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--workspace-border)]">
          <table className="w-full min-w-[520px] text-left text-[14px] leading-relaxed">
            <thead>
              <tr className="border-b border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/50 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--workspace-muted-fg)]">
                <th className="px-4 py-3 font-medium">Gate</th>
                <th className="px-4 py-3 font-medium">Pass criteria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--workspace-border)] text-[var(--workspace-muted-fg)]">
              {VALIDATION_GATES.map((row) => (
                <tr key={row.gate}>
                  <td className="px-4 py-3 font-medium text-[var(--workspace-fg)]">{row.gate}</td>
                  <td className="px-4 py-3">{row.criteria}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        id="language-check"
        className="scroll-mt-24 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 p-5 sm:p-6"
      >
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-fg)]">
          {INTRO_LANGUAGE_CHECK.title}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">{INTRO_LANGUAGE_CHECK.intro}</p>
        <p className="mt-4 text-[15px] font-medium leading-relaxed text-[var(--workspace-fg)]">
          {INTRO_LANGUAGE_CHECK.prompt}
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">{INTRO_LANGUAGE_CHECK.followUp}</p>
      </section>

      <section
        id="warm-intro"
        className="scroll-mt-24 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 p-5 sm:p-6"
      >
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-fg)]">
          {WARM_INTRO_SCRIPT.title}
        </h2>
        <p className="mt-3 text-[13px] font-medium text-[var(--workspace-muted-fg)]">
          Copy or adapt — send to someone who can intro you to an ops or account lead.
        </p>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
          {WARM_INTRO_SCRIPT.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </section>

      <section id="counter-wrapper" className="scroll-mt-24 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90 p-5 sm:p-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-fg)]">
          When they say “just AI”
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Answer with <span className="font-medium text-[var(--workspace-fg)]">artifacts</span>, not models —
          same story as{" "}
          <Link href="/docs/boundaries" className="font-medium text-[var(--workspace-accent)] hover:underline">
            Boundaries &amp; honesty
          </Link>
          .
        </p>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
          {COUNTER_WRAPPER_POINTS.map((p, i) => (
            <li key={i} className="marker:font-medium marker:text-[var(--workspace-fg)]">
              {p.text}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-fg)]">
          Discovery questions
        </h2>
        <ol className="mt-4 list-decimal space-y-6 pl-5 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
          {DISCOVERY_QUESTIONS.map((q) => (
            <li key={q.id} className="marker:font-medium marker:text-[var(--workspace-fg)]">
              <p>{q.prompt}</p>
              {q.followUp ? (
                <p className="mt-2 text-[14px] text-[var(--workspace-muted-fg)] opacity-90">
                  <span className="font-medium text-[var(--workspace-fg)]">Follow-up: </span>
                  {q.followUp}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section id="pilot-metrics" className="scroll-mt-24">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-fg)]">
          Example pilot success metrics
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
          {PILOT_METRIC_EXAMPLES.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>

      <section id="execution-30-day" className="scroll-mt-24 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/30 p-5 sm:p-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-fg)]">
          30-day execution cadence
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Practical sequence after your questions and gates — keep scope honest.
        </p>
        <ul className="mt-4 space-y-4 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
          {EXECUTION_PLAN_30_DAY.map((row) => (
            <li key={row.week}>
              <span className="font-semibold text-[var(--workspace-fg)]">{row.week}. </span>
              {row.body}
            </li>
          ))}
        </ul>
      </section>
    </WorkspaceArticle>
  );
}
