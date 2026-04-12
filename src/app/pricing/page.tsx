import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PublicPlansGrid from "@/components/marketing/PublicPlansGrid";
import { PRODUCT_VS_EPHEMERAL_CHAT } from "@/lib/product-truth";

export const metadata: Metadata = {
  title: "Pricing — Route5",
  description:
    "Plans and limits for Route5 — Free, Pro, Ultra, and Enterprise. Same packaging as in-app account settings.",
};

export default async function PricingPage() {
  const { userId } = await auth();

  return (
    <main className="theme-glass-site relative min-h-screen">
      <Navbar />
      <div className="container-apple pb-24 pt-28 md:pb-32 md:pt-32">
        <div className="mx-auto max-w-[800px] text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1d1d1f]/45">
            Pricing
          </p>
          <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-[-0.03em] text-[#1d1d1f]">
            Plans that match how you work
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[#6e6e73]">
            Same tiers you see in{" "}
            <Link href="/account/plans" className="font-medium text-[#0071e3] hover:underline">
              Account → Plans
            </Link>{" "}
            when signed in. Product scope and roadmap detail live on{" "}
            <Link href="/product" className="font-medium text-[#0071e3] hover:underline">
              What we ship
            </Link>
            .
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-[720px] rounded-2xl border border-black/[0.08] bg-white/[0.45] px-5 py-5 shadow-sm backdrop-blur-md sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#86868b]">
            Beyond a chat subscription
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-[#1d1d1f]">
            {PRODUCT_VS_EPHEMERAL_CHAT.intro}
          </p>
          <ul className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-[#6e6e73]">
            {PRODUCT_VS_EPHEMERAL_CHAT.rows.map((row) => (
              <li key={row.label} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0071e3]" aria-hidden />
                <span>
                  <strong className="font-semibold text-[#1d1d1f]">{row.label}.</strong>{" "}
                  {row.route5}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] leading-relaxed text-[#86868b]">
            <Link href="/product#chat-vs-workspace" className="font-medium text-[#0071e3] hover:underline">
              Side-by-side on What we ship →
            </Link>
          </p>
        </div>

        <PublicPlansGrid signedIn={Boolean(userId)} />

        <p className="mx-auto mt-14 max-w-lg text-center text-[13px] leading-relaxed text-[#86868b]">
          Billing changes are published here and in-app before they apply. Nothing here overrides your{" "}
          <Link href="/terms" className="font-medium text-[#0071e3] hover:underline">
            Terms
          </Link>
          . Questions?{" "}
          <Link href="/contact" className="font-medium text-[#0071e3] hover:underline">
            Contact
          </Link>{" "}
          or see{" "}
          <Link href="/trust" className="font-medium text-[#0071e3] hover:underline">
            Trust &amp; compliance
          </Link>
          .
        </p>
      </div>
      <Footer />
    </main>
  );
}
