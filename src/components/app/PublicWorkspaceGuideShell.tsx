import Link from "next/link";
import Navbar from "@/components/Navbar";

type Props = {
  children: React.ReactNode;
};

/**
 * Lets reviewers read in-app guides (e.g. /docs, /support) without signing in,
 * using the same theme tokens as the signed-in workspace.
 */
export default function PublicWorkspaceGuideShell({ children }: Props) {
  return (
    <div className="theme-agent-shell theme-route5-command relative min-h-dvh text-[var(--workspace-fg)]">
      <Navbar />
      <main className="mx-auto w-full max-w-[1280px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8">{children}</main>
      <footer className="border-t border-[var(--workspace-border)] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
            Signed-in users get Capture, Desk, projects, and integrations. You can explore scope and
            limits in <Link href="/product" className="font-medium text-[var(--workspace-accent)] hover:underline">What we ship</Link>{" "}
            and <Link href="/trust" className="font-medium text-[var(--workspace-accent)] hover:underline">Trust</Link>.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-5 text-[13px] font-semibold text-black transition hover:bg-zinc-100"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] px-5 text-[13px] font-medium text-zinc-100 hover:border-white/35"
            >
              Log in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
