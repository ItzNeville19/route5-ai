import Link from "next/link";

export default function MarketplaceAppNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-[17px] font-semibold text-[var(--ios-label)]">App not found</p>
      <p className="mt-2 text-[15px] text-[var(--ios-secondary)]">
        That item isn&apos;t in the catalog.
      </p>
      <Link
        href="/marketplace"
        className="mt-8 inline-flex min-h-[44px] items-center justify-center rounded-[12px] bg-[var(--workspace-accent)] px-8 text-[17px] font-semibold text-white"
      >
        Back to Marketplace
      </Link>
    </div>
  );
}
