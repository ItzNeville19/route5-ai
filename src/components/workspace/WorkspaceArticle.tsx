import Link from "next/link";

type Props = {
  backHref: string;
  backLabel: string;
  kicker: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
};

/** Shared long-form layout for in-app docs, billing-adjacent account pages, and help content. */
export function WorkspaceArticle({
  backHref,
  backLabel,
  kicker,
  title,
  intro,
  children,
}: Props) {
  return (
    <div className="mx-auto max-w-[760px] pb-[var(--r5-space-8)]">
      <Link
        href={backHref}
        className="group inline-flex items-center gap-1 text-[length:var(--r5-font-body)] font-medium text-r5-text-secondary transition duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] hover:text-r5-text-primary"
      >
        <span className="transition-transform duration-[var(--r5-duration-fast)] ease-[var(--r5-ease-standard)] group-hover:-translate-x-0.5">
          ←
        </span>
        {backLabel}
      </Link>

      <div className="relative mt-[var(--r5-space-6)] overflow-hidden rounded-[var(--r5-radius-lg)] border border-r5-border-subtle/90 bg-r5-surface-secondary/25 p-[var(--r5-space-5)] shadow-[var(--r5-shadow-elevated)] backdrop-blur-xl sm:p-[var(--r5-space-6)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.45]"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 0% 0%, rgba(167, 139, 250, 0.14), transparent 55%), radial-gradient(ellipse 70% 55% at 100% 0%, rgba(244, 114, 182, 0.08), transparent 50%)",
          }}
        />
        <div className="relative">
          <p className="text-[length:var(--r5-font-caption)] font-semibold uppercase tracking-[0.16em] text-r5-text-tertiary">
            {kicker}
          </p>
          <h1 className="mt-2 text-[clamp(1.5rem,4vw,2rem)] font-semibold leading-[var(--r5-leading-heading)] tracking-[-0.03em] text-r5-text-primary">
            {title}
          </h1>
          {intro ? (
            <p className="mt-[var(--r5-space-3)] max-w-2xl text-[length:var(--r5-font-subheading)] leading-relaxed text-r5-text-secondary">
              {intro}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-[var(--r5-space-6)] space-y-[var(--r5-space-6)] text-[length:var(--r5-font-subheading)] leading-relaxed text-r5-text-secondary">
        {children}
      </div>
    </div>
  );
}
