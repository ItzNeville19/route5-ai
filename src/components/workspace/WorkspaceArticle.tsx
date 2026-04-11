import Link from "next/link";

type Props = {
  backHref: string;
  backLabel: string;
  kicker: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
};

/** Shared long-form layout for in-app docs and account pages (OpenAI-style density). */
export function WorkspaceArticle({
  backHref,
  backLabel,
  kicker,
  title,
  intro,
  children,
}: Props) {
  return (
    <div className="mx-auto max-w-[720px] pb-20">
      <Link
        href={backHref}
        className="inline-flex text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
      >
        ← {backLabel}
      </Link>
      <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--workspace-muted-fg)]">
        {kicker}
      </p>
      <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[var(--workspace-fg)] sm:text-[32px]">
        {title}
      </h1>
      {intro ? (
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">{intro}</p>
      ) : null}
      <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-[var(--workspace-muted-fg)]">
        {children}
      </div>
    </div>
  );
}
