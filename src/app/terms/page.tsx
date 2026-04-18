import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Route5",
  description: "Route5 Terms of Service",
};

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By accessing or using the Route5 platform, website, or any associated services (collectively, the "Services"), you agree to be bound by these Terms of Service ("Terms"). If you are using the Services on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.

If you do not agree to these Terms, you may not access or use the Services.`,
  },
  {
    title: "2. Description of Services",
    content: `Route5 provides a web workspace where you sign in, create projects, paste enterprise text (for example notes, tickets, or threads), and receive AI-generated structured outputs including summaries, decisions, and action items. Customer data is stored in a tenant-scoped workspace as described in our documentation and privacy policy.

Optional or roadmap capabilities (such as legacy system connectors, generated APIs or MCP servers, and automated parity validation) are not part of the core Services until they are expressly released and documented. The Services are intended for business use; outputs should be reviewed by qualified personnel before operational reliance.`,
  },
  {
    title: "3. Enterprise License",
    content: `Subject to your compliance with these Terms and payment of applicable fees, Route5 grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Route5 web application for your internal business purposes, including creating projects and using decision capture and related features available in your workspace.

You may not: sublicense, sell, resell, or transfer the Route5 platform itself; reverse engineer the Route5 platform except as permitted by applicable law; or use the Services to build a competing product.`,
  },
  {
    title: "4. Customer Data and Intellectual Property",
    content: `**Your Data**: You retain rights to text and content you paste or upload into the Services, and to account and profile information you provide ("Customer Data"), subject to your agreements with your employer or clients. Route5 processes Customer Data to operate the Services (for example to generate summaries and structured outputs and to store them in your tenant-scoped workspace).

**Outputs**: Structured outputs produced from your text (such as summaries, decisions, and action items) are for your use in accordance with these Terms; you are responsible for how you rely on or distribute them.

**Route5 Technology**: Route5 retains all rights to its platform, software, models, and underlying technology. Nothing in these Terms transfers ownership of Route5's technology to you.

**Feedback**: If you provide feedback, suggestions, or ideas about the Services, Route5 may use this feedback without obligation to you.`,
  },
  {
    title: "5. Acceptable Use",
    content: `You agree not to use the Services to:

- Analyze systems you do not have legal authorization to access.
- Generate capabilities that circumvent security controls or authorization systems without proper approval.
- Interfere with or disrupt the integrity or performance of the Services.
- Attempt to gain unauthorized access to any Route5 systems or networks.
- Use the Services in violation of any applicable law or regulation.
- Introduce malicious code, viruses, or harmful data into Route5 systems.

Route5 reserves the right to suspend or terminate access for violations of this section without prior notice.`,
  },
  {
    title: "6. Reliance on AI Outputs",
    content: `The Services use AI models to generate summaries and structured information from text you provide. Outputs may be incomplete or incorrect. You are solely responsible for reviewing outputs, validating them against your own sources and policies, and deciding whether to rely on them for operational or compliance decisions.

Route5 does not guarantee that outputs will meet your requirements or be suitable for any particular use.`,
  },
  {
    title: "7. Fees and Payment",
    content: `Route5 is offered under subscription agreements negotiated directly with enterprise customers. Pricing, payment terms, and usage limits are specified in your Order Form or Master Service Agreement (MSA).

Unless otherwise specified in an Order Form:
- Subscription fees are due annually in advance.
- All fees are non-refundable except as required by law.
- Route5 may adjust pricing upon 90 days' written notice prior to renewal.
- Late payments accrue interest at 1.5% per month or the maximum rate permitted by law.`,
  },
  {
    title: "8. Confidentiality",
    content: `Each party agrees to protect the other's Confidential Information using at least the same degree of care used to protect its own confidential information, but not less than reasonable care.

"Confidential Information" includes all non-public information disclosed by one party to the other that is designated as confidential or that reasonably should be understood to be confidential.

Confidential Information does not include information that: (a) becomes publicly available without breach of this agreement; (b) was rightfully known before disclosure; (c) is rightfully received from a third party without restriction; or (d) is independently developed without use of the disclosing party's Confidential Information.`,
  },
  {
    title: "9. Disclaimer of Warranties",
    content: `THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

ROUTE5 DOES NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS, OR THAT AI-GENERATED OUTPUTS WILL MEET YOUR REQUIREMENTS OR BE ACCURATE FOR YOUR USE CASE WITHOUT INDEPENDENT REVIEW.`,
  },
  {
    title: "10. Limitation of Liability",
    content: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ROUTE5 SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR YOUR USE OF THE SERVICES.

IN NO EVENT SHALL ROUTE5'S AGGREGATE LIABILITY EXCEED THE AMOUNT PAID BY YOU TO ROUTE5 IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.

THESE LIMITATIONS APPLY REGARDLESS OF THE THEORY OF LIABILITY AND EVEN IF ROUTE5 HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.`,
  },
  {
    title: "11. Indemnification",
    content: `You agree to indemnify, defend, and hold harmless Route5 and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable legal fees, arising out of:

- Your use of the Services in violation of these Terms.
- Your deployment of Route5-generated artifacts in production systems.
- Your breach of any representation or warranty in these Terms.
- Any claim that your Customer Data infringes the rights of a third party.`,
  },
  {
    title: "12. Term and Termination",
    content: `These Terms remain in effect for the duration of your subscription. Either party may terminate for material breach if the breach is not cured within 30 days of written notice.

Route5 may immediately suspend or terminate access if you violate the Acceptable Use policy (Section 5), fail to pay fees, or if continued operation poses a security risk.

Upon termination, your license to use the Services immediately ceases. You may export Customer Data and generated artifacts within 30 days of termination, after which Route5 may delete them.`,
  },
  {
    title: "13. Governing Law and Disputes",
    content: `These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles.

Any dispute arising under these Terms shall be resolved by binding arbitration administered by JAMS under its Commercial Arbitration Rules, with proceedings held in New York, New York. The arbitrator's decision shall be final and may be entered as a judgment in any court of competent jurisdiction.

Notwithstanding the above, either party may seek injunctive or equitable relief in a court of competent jurisdiction to protect intellectual property rights or confidential information.`,
  },
  {
    title: "14. Changes to Terms",
    content: `Route5 may update these Terms at any time. For existing customers, material changes will be communicated with at least 30 days' advance notice by email or through the platform. Continued use of the Services after the effective date constitutes acceptance of the updated Terms.

For new users, the Terms in effect at the time of account creation apply immediately.`,
  },
  {
    title: "15. Contact",
    content: `Questions about these Terms should be directed to:

**Route5**
contact@route5.ai`,
  },
];

export default function TermsPage() {
  return (
    <div className="theme-glass-site min-h-screen text-[#1d1d1f]">
      <nav className="border-b border-black/[0.08] bg-white/45 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4 lg:max-w-4xl">
          <Link
            href="/"
            className="text-[15px] font-semibold tracking-[-0.03em] text-[#1d1d1f]"
          >
            Route5
          </Link>
          <span className="text-sm text-[#86868b]">/</span>
          <span className="text-sm text-[#6e6e73]">Terms of Service</span>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-16 lg:max-w-4xl lg:py-24">
        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold tracking-[-0.03em] text-[#1d1d1f]">
            Terms of Service
          </h1>
          <p className="text-[#6e6e73]">
            Effective date: March 18, 2026 · Last updated: April 8, 2026
          </p>
        </div>

        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="mb-4 text-xl font-semibold tracking-[-0.02em] text-[#1d1d1f]">
                {section.title}
              </h2>
              <div className="space-y-3 leading-relaxed text-[#6e6e73]">
                {section.content.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-black/[0.08] pt-8">
          <Link
            href="/"
            className="text-sm font-medium text-[#0071e3] transition hover:text-[#0077ed]"
          >
            ← Back to Route5
          </Link>
        </div>
      </div>
    </div>
  );
}
