import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MarketingPublicShell from "@/components/marketing/MarketingPublicShell";
import { getDesktopDownloadUrl, isDesktopDownloadConfigured } from "@/lib/desktop-install-url";

export const metadata: Metadata = {
  title: "Download — Route5",
  description:
    "Use Route5 on the web, add to your home screen, or install the desktop app for Mac.",
};

export default function DownloadPage() {
  const desktopUrl = getDesktopDownloadUrl();
  const hasHostedInstaller = isDesktopDownloadConfigured();

  return (
    <MarketingPublicShell>
      <Navbar />
      <article className="route5-page-transition relative z-10 mx-auto max-w-[820px] px-5 pb-24 pt-28 text-zinc-100 md:px-8 md:pt-32">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/85">
          Desktop client
        </p>
        <h1 className="mt-4 text-[clamp(1.75rem,4.5vw,2.5rem)] font-semibold tracking-[-0.04em] text-white">
          Route5 for desktop
        </h1>
        <p className="mt-4 max-w-[62ch] text-[17px] leading-[1.55] text-zinc-100">
          The desktop app runs the same Route5 workspace in a dedicated window—install, sign in, and work like any
          other professional application.
        </p>

        <div className="route5-marketing-panel mt-10 rounded-2xl border border-white/12 bg-[#0c1218] p-6 md:p-8">
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-emerald-200/85">Download options</p>
          {hasHostedInstaller ? (
            <>
              <p className="mt-2 text-[16px] leading-relaxed text-zinc-100">
                On Mac, open the disk image, drag Route5 into Applications, then launch. Windows builds follow the same
                release pipeline when available.
              </p>
              <a
                href={desktopUrl}
                className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-sky-500 px-8 text-[15px] font-semibold text-[#041210] shadow-md shadow-cyan-500/25 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                rel="noopener noreferrer"
              >
                Download for your computer
              </a>
            </>
          ) : (
            <>
              <p className="mt-2 text-[16px] leading-relaxed text-zinc-100">
                A hosted installer is not published on this deployment yet. Use Route5 in the browser, add it to your
                home screen, or ask your admin for a build. When{" "}
                <span className="font-mono text-[13px] text-zinc-200">NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL</span> is set, a
                direct download appears here automatically.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-500 px-8 text-[15px] font-semibold text-[#041210] shadow-md shadow-cyan-500/25 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                >
                  Open Route5 on the web
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-slate-600 bg-slate-950 px-8 text-[15px] font-semibold text-white shadow-lg shadow-black/40 transition hover:border-slate-500 hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                >
                  Contact for desktop rollout
                </Link>
              </div>
            </>
          )}
        </div>

        <section className="mt-14 border-t border-white/10 pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-emerald-200/85">
            Browser &amp; home screen
          </h2>
          <p className="mt-4 text-[16px] leading-[1.55] text-zinc-100">
            For browser-only access, open{" "}
            <Link href="/login" className="font-medium text-sky-400 underline-offset-2 hover:underline">
              Sign in
            </Link>{" "}
            and use <strong className="font-semibold text-white">Install</strong> or{" "}
            <strong className="font-semibold text-white">Add to Home Screen</strong> when your browser offers it.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-200">
            On phone or tablet: Share → Add to Home Screen for a shortcut to your workspace.
          </p>
        </section>

        <section className="mt-14 border-t border-white/10 pt-12">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-emerald-200/85">
            Marketplace &amp; workspace
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-zinc-100">
            Integrations stay in sync whether you use desktop or web.
          </p>
        </section>

        <p className="mt-14 text-[15px] leading-relaxed text-zinc-200">
          <Link href="/login" className="font-medium text-sky-400 underline-offset-2 hover:underline">
            Sign in to the workspace
          </Link>{" "}
          ·{" "}
          <Link href="/trust" className="font-medium text-sky-400 underline-offset-2 hover:underline">
            Trust &amp; boundaries
          </Link>
        </p>
      </article>
      <Footer tone="command" />
    </MarketingPublicShell>
  );
}
