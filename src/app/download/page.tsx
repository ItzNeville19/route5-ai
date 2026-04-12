import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Download — Route5",
  description:
    "Install Route5 as a PWA or desktop app. Sessions, sign-out, and how we harden the workspace.",
};

const desktopArtifactHint =
  process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL?.trim() || "";

export default function DownloadPage() {
  return (
    <main className="theme-glass-site relative min-h-screen">
      <Navbar />
      <article className="mx-auto max-w-[820px] px-5 pb-24 pt-28 md:px-8 md:pt-32">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1d1d1f]/45">
          Route5 · install
        </p>
        <h1 className="mt-4 text-[clamp(1.75rem,4.5vw,2.5rem)] font-semibold tracking-[-0.04em] text-[#1d1d1f]">
          Download & install
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-[#6e6e73]">
          Use Route5 in the browser, add it to your home screen, or run the desktop shell. Signing out
          always returns you to the secure sign-in flow — not a random marketing page.
        </p>

        <section className="mt-14 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            Web & PWA
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#1d1d1f]">
            Open{" "}
            <Link href="/login" className="font-medium text-[#0071e3] hover:underline">
              Sign in
            </Link>{" "}
            in Chrome, Edge, or Safari. Use your browser&apos;s{" "}
            <strong className="font-semibold">Install</strong> or{" "}
            <strong className="font-semibold">Add to Home Screen</strong> when prompted — the workspace
            sidebar may show <span className="font-medium">Install app</span> when the browser supports
            it.
          </p>
        </section>

        <section className="mt-14 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            Desktop (Electron)
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#1d1d1f]">
            The repo ships a packaged desktop app: Node runs the Next.js standalone server locally, and
            Electron loads it in a hardened window (no Node integration in the page, context isolation,
            sandbox on).
          </p>
          <h3 className="mt-8 text-[15px] font-semibold text-[#1d1d1f]">Build from source</h3>
          <pre className="mt-3 overflow-x-auto rounded-2xl border border-black/[0.08] bg-[#f4f4f5] p-4 text-[13px] leading-relaxed text-[#1d1d1f]">
            {`npm install
npm run build
npm run electron:dist`}
          </pre>
          <p className="mt-4 text-[15px] leading-relaxed text-[#6e6e73]">
            Artifacts land under{" "}
            <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[12px]">dist-electron/</code>{" "}
            (e.g. <code className="font-mono text-[12px]">.dmg</code> on macOS).
          </p>
          {desktopArtifactHint ? (
            <p className="mt-4 text-[15px] leading-relaxed text-[#1d1d1f]">
              <a
                href={desktopArtifactHint}
                className="font-medium text-[#0071e3] hover:underline"
                rel="noopener noreferrer"
              >
                Direct download (configured for this deployment)
              </a>
            </p>
          ) : (
            <p className="mt-4 text-[14px] leading-relaxed text-[#86868b]">
              Hosts can set{" "}
              <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[12px]">
                NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL
              </code>{" "}
              to point at a release artifact.
            </p>
          )}
        </section>

        <section className="mt-14 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            Sessions & sign-out
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-[#1d1d1f]">
            When you sign out from the workspace (account menu), you are sent to{" "}
            <strong className="font-semibold">/login</strong> with a clear &quot;Signed out&quot; state —
            not the marketing homepage — so it&apos;s obvious the session ended.
          </p>
        </section>

        <section className="mt-14 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            Security posture (high level)
          </h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-[16px] leading-relaxed text-[#6e6e73]">
            <li>
              HTTP responses include frame denial, MIME sniffing protection, strict referrer policy, and
              locked-down browser features (camera/mic/geolocation) via{" "}
              <code className="font-mono text-[13px]">Permissions-Policy</code>.
            </li>
            <li>
              Production deployments should be served over HTTPS; we emit{" "}
              <code className="font-mono text-[13px]">Strict-Transport-Security</code> when{" "}
              <code className="font-mono text-[13px]">NODE_ENV=production</code>.
            </li>
            <li>
              Destructive actions (e.g. deleting a project) require typing <strong>delete</strong> and, for
              password-based accounts, verifying your Clerk password on the server.
            </li>
          </ul>
        </section>

        <p className="mt-14 text-[15px] leading-relaxed text-[#6e6e73]">
          <Link href="/login" className="font-medium text-[#0071e3] hover:underline">
            Sign in to the workspace
          </Link>{" "}
          ·{" "}
          <Link href="/trust" className="font-medium text-[#0071e3] hover:underline">
            Trust &amp; boundaries
          </Link>
        </p>
      </article>
      <Footer />
    </main>
  );
}
