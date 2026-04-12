import Link from "next/link";
import { ADVERTISING_DISCLOSURES } from "@/lib/advertising-disclosures";

const platform: { href: string; label: string; title: string }[] = [
  { href: "/product", label: "What we ship", title: "Product scope — live vs roadmap" },
  { href: "/pricing", label: "Pricing", title: "Plans and packaging" },
  { href: "/#showcase", label: "Home — workspace preview", title: "Jump to the workspace preview on the home page" },
  { href: "/projects", label: "Workspace", title: "Signed-in app — projects and Desk" },
  { href: "/login", label: "Log in", title: "Sign in with Clerk" },
];

const company: { href: string; label: string; title: string }[] = [
  { href: "/contact", label: "Contact", title: "Sales, support, and priorities" },
  { href: "/download", label: "Download", title: "PWA and desktop install" },
  { href: "/trust", label: "Trust & compliance", title: "Security questionnaire, DPA, procurement" },
  { href: "/privacy", label: "Privacy Policy", title: "How we handle data — full policy" },
  { href: "/terms", label: "Terms of Service", title: "Terms of use" },
];

type FooterProps = {
  tone?: "light" | "command";
};

export default function Footer({ tone = "light" }: FooterProps) {
  const command = tone === "command";
  const brand = command ? "text-white" : "text-[#1d1d1f]";
  const muted = command ? "text-zinc-300" : "text-[#6e6e73]";
  const heading = command ? "text-zinc-200" : "text-[#1d1d1f]/80";
  const linkHover = command
    ? "text-[14px] text-zinc-300 transition-colors hover:text-white hover:underline hover:underline-offset-2"
    : "text-[14px] text-[#6e6e73] transition-colors hover:text-[#1d1d1f] hover:underline hover:underline-offset-2";
  const footBorder = command ? "border-white/10" : "border-black/[0.06]";
  const footMuted = command ? "text-zinc-400" : "text-[#86868b]";
  const footLink = command
    ? "font-medium text-sky-400 underline-offset-2 hover:underline"
    : "font-medium text-[#0071e3] underline-offset-2 hover:underline";

  return (
    <footer
      className={
        command
          ? "border-t border-white/10 bg-black/20 backdrop-blur-xl"
          : "glass-liquid-nav border-t border-white/50"
      }
    >
      <div className="mx-auto max-w-[1440px] px-6 py-14 lg:px-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="2" y="2" width="9" height="9" rx="2" fill="#0071e3" />
                <rect
                  x="13"
                  y="2"
                  width="9"
                  height="9"
                  rx="2"
                  fill={command ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)"}
                />
                <rect
                  x="2"
                  y="13"
                  width="9"
                  height="9"
                  rx="2"
                  fill={command ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}
                />
                <rect
                  x="13"
                  y="13"
                  width="9"
                  height="9"
                  rx="2"
                  fill={command ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}
                />
              </svg>
              <span className={`text-[18px] font-semibold tracking-[-0.03em] ${brand}`}>
                Route5
              </span>
            </div>
            <p className={`mt-3 text-[14px] leading-relaxed ${muted}`}>
              Structured intelligence from enterprise text — honest about what is live
              versus roadmap.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            <div>
              <h4 className={`label-text mb-4 font-semibold ${heading}`}>
                Platform
              </h4>
              <ul className="space-y-3">
                {platform.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} title={item.title} className={linkHover}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className={`label-text mb-4 font-semibold ${heading}`}>
                Company
              </h4>
              <ul className="space-y-3">
                {company.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} title={item.title} className={linkHover}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className={`mt-12 border-t pt-8 ${footBorder}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className={`text-[13px] font-medium ${footMuted}`}>
              &copy; 2026 Route5, Inc. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
              <p className={`max-w-2xl text-[12px] leading-relaxed ${footMuted}`}>
                {ADVERTISING_DISCLOSURES.aiHumanReview} {ADVERTISING_DISCLOSURES.plansShort}
              </p>
              <Link href="/contact" title="Contact form" className={footLink}>
                Contact
              </Link>
              <Link href="/trust" title="Trust and compliance" className={footLink}>
                Trust
              </Link>
              <Link href="/privacy" title="Privacy Policy — full site" className={footLink}>
                Privacy
              </Link>
              <Link href="/terms" title="Terms of Service" className={footLink}>
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
