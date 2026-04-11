import Link from "next/link";

const platform = [
  { href: "/pitch", label: "What we ship" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#product", label: "Home — product summary" },
  { href: "/projects", label: "Workspace" },
  { href: "/login", label: "Log in" },
];

const company = [
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

export default function Footer() {
  return (
    <footer className="glass-liquid-nav border-t border-white/50">
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
                  fill="rgba(0,0,0,0.12)"
                />
                <rect x="2" y="13" width="9" height="9" rx="2" fill="rgba(0,0,0,0.08)" />
                <rect x="13" y="13" width="9" height="9" rx="2" fill="rgba(0,0,0,0.06)" />
              </svg>
              <span className="text-[18px] font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                Route5
              </span>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-[#6e6e73]">
              Structured intelligence from enterprise text — honest about what is live
              versus roadmap.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            <div>
              <h4 className="label-text mb-4 font-semibold text-[#1d1d1f]/80">
                Platform
              </h4>
              <ul className="space-y-3">
                {platform.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-[14px] text-[#6e6e73] transition-colors hover:text-[#1d1d1f] hover:underline hover:underline-offset-2"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="label-text mb-4 font-semibold text-[#1d1d1f]/80">
                Company
              </h4>
              <ul className="space-y-3">
                {company.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-[14px] text-[#6e6e73] transition-colors hover:text-[#1d1d1f] hover:underline hover:underline-offset-2"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-black/[0.06] pt-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[13px] font-medium text-[#86868b]">
              &copy; 2026 Route5, Inc. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
              <p className="max-w-2xl text-[12px] leading-relaxed text-[#86868b]">
                AI outputs require human review before operational decisions.
              </p>
              <Link
                href="/contact"
                className="font-medium text-[#0071e3] underline-offset-2 hover:underline"
              >
                Contact
              </Link>
              <Link
                href="/privacy"
                className="font-medium text-[#0071e3] underline-offset-2 hover:underline"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="font-medium text-[#0071e3] underline-offset-2 hover:underline"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
