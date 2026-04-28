import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Download — Route5",
  description:
    "Install the Route5 desktop client (Electron). Optional web and PWA access for the same workspace.",
};

const desktopArtifactUrl = process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL?.trim() || "";

export default function DownloadPage() {
  return (
    <main className="route5-brand-marketing-page theme-glass-site relative min-h-screen">
      <Navbar />
      <article className="route5-page-transition relative z-10 mx-auto max-w-[820px] px-5 pb-24 pt-28 md:px-8 md:pt-32">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1d1d1f]/45">
          Desktop client
        </p>
        <h1 className="mt-4 text-[clamp(1.75rem,4.5vw,2.5rem)] font-semibold tracking-[-0.04em] text-[#1d1d1f]">
          Route5 for desktop
        </h1>
        <p className="mt-4 max-w-[62ch] text-[17px] leading-[1.55] text-[#6e6e73]">
          The packaged app is a real desktop install: an Electron shell runs the production Next.js server locally
          and loads your workspace in a hardened window. Same product as web — offline-capable runtime, not a saved
          shortcut to a generic site.
        </p>

        {desktopArtifactUrl ? (
          <div className="route5-marketing-panel mt-10 border border-black/[0.08] bg-[#f5f5f7] p-6 md:p-7">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
              Direct download
            </p>
            <p className="mt-2 text-[16px] leading-relaxed text-[#1d1d1f]">
              Your deployment hosts the signed artifact (typically <span className="font-medium">.dmg</span> or{" "}
              <span className="font-medium">.zip</span> on macOS; Windows builds ship as an installer from the same
              pipeline). Open the file, move Route5 into Applications (or run the installer), then launch — the app
              starts the embedded server and opens the workspace automatically.
            </p>
            <a
              href={desktopArtifactUrl}
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#0071e3] px-8 text-[15px] font-semibold text-white shadow-md shadow-[#0071e3]/22 transition-colors duration-150 ease-out hover:bg-[#0077ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3]"
              rel="noopener noreferrer"
            >
              Download desktop build
            </a>
          </div>
        ) : (
          <div className="route5-marketing-panel mt-10 border border-black/[0.06] bg-[#fafafa] p-6 md:p-7">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
              Hosted installer
            </p>
            <p className="mt-2 text-[16px] leading-relaxed text-[#1d1d1f]">
              No public download URL is set for this environment. Build with{" "}
              <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[12px]">npm run electron:dist</code>
              , publish the artifact (for example GitHub Releases or internal object storage), then configure{" "}
              <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[12px]">
                NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL
              </code>{" "}
              in Vercel to the stable HTTPS link for your <span className="font-medium">.dmg</span>,{" "}
              <span className="font-medium">.zip</span>, or Windows installer. The primary button on this page appears
              once that variable is set.
            </p>
          </div>
        )}

        <section className="mt-14 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            Web &amp; PWA <span className="font-normal text-[#a1a1a6]">(secondary)</span>
          </h2>
          <p className="mt-4 text-[16px] leading-[1.55] text-[#1d1d1f]">
            For browser-only or mobile home-screen access, open{" "}
            <Link href="/login" className="font-medium text-[#0071e3] underline-offset-2 hover:underline">
              Sign in
            </Link>{" "}
            in Chrome, Edge, or Safari. Use <strong className="font-semibold">Install</strong> or{" "}
            <strong className="font-semibold">Add to Home Screen</strong> when the browser offers it — that path is a
            progressive web app, not the packaged desktop client above.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-[#6e6e73]">
            On iPhone or Android: Share → Add to Home Screen. The installed PWA uses the same workspace data as web.
          </p>
        </section>

        <section className="mt-14 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            Build &amp; artifacts
          </h2>
          <p className="mt-4 text-[16px] leading-[1.55] text-[#6e6e73]">
            macOS targets include <span className="font-medium text-[#1d1d1f]">.dmg</span> and{" "}
            <span className="font-medium text-[#1d1d1f]">.zip</span>; Windows via NSIS; Linux AppImage. Output directory:{" "}
            <code className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[12px]">dist-electron/</code>.
          </p>
          <pre className="route5-marketing-panel mt-4 overflow-x-auto border border-black/[0.08] bg-[#f4f4f5] p-4 text-[13px] leading-relaxed text-[#1d1d1f]">
            {`npm install
npm run build
npm run electron:dist`}
          </pre>
        </section>

        <section className="mt-14 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            Marketplace install behavior
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#1d1d1f]">
            Installing from the marketplace connects integrations to your existing workspace. It does not fork data —
            Desk, commitments, and digests stay in sync across desktop and web.
          </p>
        </section>

        <section className="mt-14 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            Sessions &amp; sign-out
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#1d1d1f]">
            Signing out from the account menu ends the session and returns you to{" "}
            <strong className="font-semibold">/login</strong> with a clear signed-out state.
          </p>
        </section>

        <section className="mt-14 border-t border-black/[0.08] pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">
            Security posture (high level)
          </h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-[16px] leading-relaxed text-[#6e6e73]">
            <li>
              Responses use frame denial, MIME sniffing protection, strict referrer policy, and a restrictive{" "}
              <code className="font-mono text-[13px]">Permissions-Policy</code>.
            </li>
            <li>
              Production should use HTTPS;{" "}
              <code className="font-mono text-[13px]">Strict-Transport-Security</code> is sent when{" "}
              <code className="font-mono text-[13px]">NODE_ENV=production</code>.
            </li>
            <li>
              Destructive actions require typing <strong>delete</strong> and, for password accounts, Clerk password
              verification on the server.
            </li>
          </ul>
        </section>

        <p className="mt-14 text-[15px] leading-relaxed text-[#6e6e73]">
          <Link href="/login" className="font-medium text-[#0071e3] underline-offset-2 hover:underline">
            Sign in to the workspace
          </Link>{" "}
          ·{" "}
          <Link href="/trust" className="font-medium text-[#0071e3] underline-offset-2 hover:underline">
            Trust &amp; boundaries
          </Link>
        </p>
      </article>
      <Footer />
    </main>
  );
}
