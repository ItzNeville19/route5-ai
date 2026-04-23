"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

type Props = {
  /** e.g. `/overview` or `/desk` */
  signedInHref: string;
  /** e.g. `Workspace` — shown before the arrow in comments only; label is always “← …” */
  signedInLabel: string;
  className?: string;
};

/**
 * In-app pages that are also readable while signed out: back link goes to workspace when
 * authenticated, otherwise to the public product narrative.
 */
export default function WorkspaceOrProductBackLink({
  signedInHref,
  signedInLabel,
  className = "inline-flex text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]",
}: Props) {
  const { userId, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <span className={`${className} cursor-default opacity-60`} aria-hidden>
        ← Loading…
      </span>
    );
  }

  if (userId) {
    return (
      <Link href={signedInHref} className={className}>
        ← {signedInLabel}
      </Link>
    );
  }

  return (
    <Link href="/product" className={className}>
      ← Product
    </Link>
  );
}
