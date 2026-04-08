import Link from "next/link";

const platform = [
  { label: "Multi-Signal Extraction" },
  { label: "MCP Generation" },
  { label: "Parity Validation" },
  { label: "Guardrails" },
  { label: "Observability" },
];

const industries = [
  "Banking",
  "Insurance",
  "Healthcare",
  "Government",
  "Asset Management",
];

const company = [
  { href: "#contact", label: "Request a Briefing" },
  { href: "#contact", label: "Contact" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

const resources = [
  { label: "Documentation" },
  { label: "API Reference" },
  { label: "Security Whitepaper" },
  { label: "Blog" },
];

const badges = ["SOC 2", "ISO 27001", "GDPR", "HIPAA"];

export default function Footer() {
  return (
    <footer className="bg-[#1d1d1f] text-[#86868b] border-t border-white/10">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-16">
        {/* Brand Section */}
        <div className="mb-14 pb-10 border-b border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="9" height="9" rx="2" fill="#0071e3" />
              <rect x="13" y="2" width="9" height="9" rx="2" fill="rgba(255,255,255,0.2)" />
              <rect x="2" y="13" width="9" height="9" rx="2" fill="rgba(255,255,255,0.2)" />
              <rect x="13" y="13" width="9" height="9" rx="2" fill="rgba(255,255,255,0.1)" />
            </svg>
            <span className="text-[20px] font-semibold text-white tracking-[-0.03em]">
              Route5
            </span>
          </div>
          <p className="text-[15px] leading-relaxed text-[#a1a1a6] max-w-[500px] mb-6">
            The AI Execution Layer for Enterprise Systems
          </p>

          {/* Compliance badges */}
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                key={badge}
                className="px-3 py-1.5 text-[11px] font-semibold text-white bg-white/5 border border-white/10 rounded-lg"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Four-column grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Platform */}
          <div>
            <h4 className="label-text text-white mb-6 font-semibold">Platform</h4>
            <ul className="space-y-4">
              {platform.map((item) => (
                <li key={item.label}>
                  <span className="text-[14px] text-[#a1a1a6] hover:text-white transition-colors tracking-[-0.01em]">
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Industries */}
          <div>
            <h4 className="label-text text-white mb-6 font-semibold">Industries</h4>
            <ul className="space-y-4">
              {industries.map((industry) => (
                <li key={industry}>
                  <span className="text-[14px] text-[#a1a1a6] hover:text-white transition-colors tracking-[-0.01em]">
                    {industry}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="label-text text-white mb-6 font-semibold">Company</h4>
            <ul className="space-y-4">
              {company.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[14px] text-[#a1a1a6] hover:text-white transition-colors tracking-[-0.01em]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="label-text text-white mb-6 font-semibold">Resources</h4>
            <ul className="space-y-4">
              {resources.map((item) => (
                <li key={item.label}>
                  <span className="text-[14px] text-[#a1a1a6] hover:text-white transition-colors tracking-[-0.01em]">
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-10 border-t border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-[13px] text-[#6e6e73] font-medium mb-2">
                &copy; 2025 Route5, Inc. All rights reserved.
              </p>
              <p className="text-[12px] text-[#6e6e73] leading-relaxed max-w-2xl">
                All generated artifacts require human review and approval before production
                deployment. Route5 is not liable for outcomes resulting from deployment
                without approved validation.{" "}
                <Link
                  href="/terms"
                  className="text-[#0071e3] hover:text-[#0077ed] underline underline-offset-2"
                >
                  Learn more
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-6 text-[13px] flex-shrink-0">
              <a
                href="mailto:security@route5.ai"
                className="text-[#6e6e73] hover:text-white transition-colors"
              >
                Security
              </a>
              <Link
                href="/privacy"
                className="text-[#6e6e73] hover:text-white transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-[#6e6e73] hover:text-white transition-colors"
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
