import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Route5",
  description: "Route5 Privacy Policy",
};

const sections = [
  {
    title: "1. Information We Collect",
    content: `We collect information you provide directly to us when you request a demo, contact us, or use our platform. This includes:

- **Contact information**: Name, email address, job title, company name, and phone number.
- **Account information**: Login credentials and profile details when you create an account.
- **Usage data**: Information about how you interact with our platform, including log data, IP addresses, browser type, pages visited, and timestamps.
- **Technical data**: Legacy system metadata you upload or connect to our platform for analysis purposes.

We do not collect or store the contents of your production databases, source code, or sensitive business data beyond what is necessary to provide the Route5 service.`,
  },
  {
    title: "2. How We Use Your Information",
    content: `We use the information we collect to:

- Provide, operate, and improve the Route5 platform and services.
- Send you technical notices, security alerts, and support communications.
- Respond to your comments and questions and provide customer service.
- Send marketing communications about products, services, and events (you may opt out at any time).
- Monitor and analyze usage trends to improve user experience.
- Detect, investigate, and prevent fraudulent transactions and other illegal activities.
- Comply with legal obligations and enforce our terms.`,
  },
  {
    title: "3. Data Residency and On-Premise Deployments",
    content: `Route5 is designed with enterprise data sovereignty as a core principle.

**On-Premise Deployments**: All tracing agents, AI analysis, and data processing run entirely within your infrastructure. No source code, execution traces, database queries, or business logic data leaves your environment.

**Hybrid Deployments**: Where the AI analysis engine runs in Route5 cloud infrastructure, all data in transit is encrypted using TLS 1.3. Sensitive fields identified as PII, PCI, or PHI are masked before transmission and are never stored in Route5 systems.

**Bring Your Own LLM**: You may configure Route5 to use your own Azure OpenAI, AWS Bedrock, or self-hosted language model endpoint. In this configuration, no AI inference requests are sent to Route5 or third-party AI providers.`,
  },
  {
    title: "4. Data Sharing and Disclosure",
    content: `We do not sell, trade, or rent your personal information to third parties. We may share information in the following limited circumstances:

- **Service Providers**: We engage trusted third-party vendors (e.g., cloud hosting, analytics) who process data on our behalf under strict data processing agreements.
- **Legal Requirements**: We may disclose information if required by law, subpoena, court order, or other governmental request.
- **Business Transfers**: In the event of a merger, acquisition, or sale of assets, user information may be transferred as part of that transaction, subject to equivalent privacy protections.
- **With Your Consent**: We may share information with third parties when you have given explicit consent.`,
  },
  {
    title: "5. Data Retention",
    content: `We retain personal information for as long as necessary to fulfill the purposes described in this policy, unless a longer retention period is required by law.

- **Account data** is retained for the duration of your account and deleted within 90 days of account termination upon request.
- **Usage logs** are retained for up to 12 months for security and debugging purposes.
- **Trace data and capability artifacts** generated during a Route5 session are retained according to your configured workspace retention policy, with a default maximum of 90 days.`,
  },
  {
    title: "6. Security",
    content: `Route5 implements industry-standard security practices to protect your information:

- All data in transit is encrypted using TLS 1.3.
- Data at rest is encrypted using AES-256.
- Access to production systems is restricted to authorized personnel via multi-factor authentication.
- We conduct periodic security assessments and penetration tests.
- We maintain SOC 2 Type II compliance.

Despite these measures, no system is completely secure. We encourage you to use strong passwords and to notify us immediately at security@route5.ai if you suspect any unauthorized access.`,
  },
  {
    title: "7. Your Rights",
    content: `Depending on your jurisdiction, you may have the following rights regarding your personal data:

- **Access**: Request a copy of the personal data we hold about you.
- **Correction**: Request that we correct inaccurate or incomplete data.
- **Deletion**: Request deletion of your personal data, subject to legal retention requirements.
- **Portability**: Request your data in a machine-readable format.
- **Objection**: Object to processing based on legitimate interests or for direct marketing.
- **Restriction**: Request that we limit how we use your data pending a dispute.

To exercise these rights, contact us at privacy@route5.ai. We will respond within 30 days.`,
  },
  {
    title: "8. Cookies and Tracking",
    content: `We use cookies and similar tracking technologies to operate our website and understand usage patterns. These include:

- **Essential cookies**: Required for the website to function correctly.
- **Analytics cookies**: Help us understand how visitors use our site (e.g., Google Analytics with IP anonymization enabled).
- **Preference cookies**: Remember your settings and preferences.

You can control cookie settings through your browser. Note that disabling certain cookies may affect the functionality of our website.`,
  },
  {
    title: "9. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. When we make material changes, we will notify you by email or through a prominent notice on our website prior to the change becoming effective. We encourage you to review this policy periodically.

The date at the top of this page indicates when this policy was last updated.`,
  },
  {
    title: "10. Contact Us",
    content: `If you have questions about this Privacy Policy or our data practices, please contact us:

**Route5, Inc.**
privacy@route5.ai

For EU/EEA residents, Route5's EU Representative can be contacted at: dpo@route5.ai`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-500/20 rounded-md rotate-45" />
              <span className="relative text-blue-400 font-bold text-sm font-mono">
                R5
              </span>
            </div>
            <span className="text-lg font-semibold">
              Route<span className="text-blue-400">5</span>
            </span>
          </Link>
          <span className="text-text-secondary text-sm">/</span>
          <span className="text-sm text-text-secondary">Privacy Policy</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16 lg:py-24">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-text-secondary">
            Effective date: March 18, 2026 · Last updated: March 18, 2026
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-10">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
              <div className="text-text-secondary leading-relaxed space-y-3 whitespace-pre-line">
                {section.content.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-border">
          <Link
            href="/"
            className="text-sm text-accent hover:text-blue-300 transition-colors"
          >
            ← Back to Route5.ai
          </Link>
        </div>
      </div>
    </div>
  );
}
