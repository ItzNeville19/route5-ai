import { ADVERTISING_DISCLOSURES } from "@/lib/advertising-disclosures";

type Variant = "plans-grid" | "plans-short" | "product" | "account";

const COPY: Record<Variant, string> = {
  "plans-grid": ADVERTISING_DISCLOSURES.plansGrid,
  "plans-short": ADVERTISING_DISCLOSURES.plansShort,
  product: ADVERTISING_DISCLOSURES.productFooter,
  account: ADVERTISING_DISCLOSURES.accountPlans,
};

const DEFAULT_TITLE: Partial<Record<Variant, string>> = {
  product: "Scope & expectations",
};

/**
 * Visible “safe harbor” copy — reduces mismatch between marketing language and shipped product.
 */
export default function AdvertisingSafeHarbor({
  variant,
  title,
  className = "",
}: {
  variant: Variant;
  /** Overrides the default heading for this variant */
  title?: string;
  className?: string;
}) {
  const text = COPY[variant];
  const isCompact = variant === "plans-short" || variant === "account";
  const heading =
    title ??
    (DEFAULT_TITLE[variant] ?? "Important — read before buying");

  return (
    <aside
      role="note"
      className={`rounded-2xl border border-black/[0.08] bg-black/[0.02] text-left ${isCompact ? "px-4 py-3 text-[12px] leading-relaxed text-[#6e6e73]" : "px-5 py-4 text-[13px] leading-relaxed text-[#5c5c5c]"} ${className}`}
    >
      <p className="font-semibold text-[#424245]">{heading}</p>
      <p className="mt-2 [text-wrap:pretty]">{text}</p>
    </aside>
  );
}
