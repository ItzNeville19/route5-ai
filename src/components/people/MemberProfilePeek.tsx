"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { Copy, Mail, X } from "lucide-react";
import { useMemberDirectory, type MemberProfile } from "@/components/workspace/MemberProfilesProvider";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { ownerAccentBg } from "@/lib/people/owner-avatar-style";
import { ownerInitialsFromId } from "@/components/feed/feed-user-display";

type Props = {
  userId: string;
  anchorRect: DOMRect;
  onClose: () => void;
  selfDisplayName: string;
  selfInitials: string;
};

export default function MemberProfilePeek({
  userId,
  anchorRect,
  onClose,
  selfDisplayName,
  selfInitials,
}: Props) {
  const { user } = useUser();
  const { get, displayName } = useMemberDirectory();
  const { pushToast } = useWorkspaceExperience();
  const panelRef = useRef<HTMLDivElement>(null);

  const isSelf = user?.id === userId;
  const remote = get(userId);
  const profile: MemberProfile | null = isSelf
    ? {
        userId,
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
        username: user?.username ?? null,
        imageUrl: user?.imageUrl ?? null,
        primaryEmail: user?.primaryEmailAddress?.emailAddress ?? null,
      }
    : remote ?? null;

  const name = displayName(userId, user?.id, selfDisplayName);
  const email = profile?.primaryEmail ?? null;
  const username = profile?.username?.trim() || null;
  const src = profile?.imageUrl ?? null;
  const initials = ownerInitialsFromId(userId, user?.id, selfDisplayName, selfInitials);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const t = window.setTimeout(() => document.addEventListener("mousedown", onDoc), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const top = Math.min(anchorRect.bottom + 8, window.innerHeight - 280);
  const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - 300));

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      pushToast(`Copied ${label}`, "success");
    } catch {
      pushToast("Could not copy", "error");
    }
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`Profile: ${name}`}
      className="fixed z-[480] w-[min(calc(100vw-16px),280px)] rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-primary p-3 shadow-[var(--r5-shadow-elevated)]"
      style={{ top, left }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 gap-3">
          {src ? (
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
              <Image src={src} alt="" width={48} height={48} className="object-cover" />
            </span>
          ) : (
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-white ring-1 ring-white/10"
              style={{ backgroundColor: ownerAccentBg(userId) }}
            >
              {initials}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-r5-text-primary">{name}</p>
            {username ? (
              <p className="truncate text-[12px] text-r5-text-secondary">@{username}</p>
            ) : null}
            {email ? (
              <p className="truncate text-[11px] text-r5-text-tertiary">{email}</p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-r5-text-tertiary hover:bg-r5-surface-hover hover:text-r5-text-primary"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-r5-border-subtle/60 pt-3">
        {email ? (
          <>
            <a
              href={`mailto:${encodeURIComponent(email)}`}
              className="inline-flex items-center gap-1.5 rounded-[var(--r5-radius-md)] border border-r5-border-subtle/80 bg-r5-surface-secondary/50 px-2.5 py-1.5 text-[12px] font-medium text-r5-text-primary transition hover:bg-r5-surface-hover"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden />
              Email
            </a>
            <button
              type="button"
              onClick={() => void copyText("email", email)}
              className="inline-flex items-center gap-1.5 rounded-[var(--r5-radius-md)] border border-r5-border-subtle/80 px-2.5 py-1.5 text-[12px] text-r5-text-secondary hover:bg-r5-surface-hover hover:text-r5-text-primary"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copy
            </button>
          </>
        ) : null}
        {username ? (
          <button
            type="button"
            onClick={() => void copyText("username", username)}
            className="inline-flex items-center gap-1.5 rounded-[var(--r5-radius-md)] border border-r5-border-subtle/80 px-2.5 py-1.5 text-[12px] text-r5-text-secondary hover:bg-r5-surface-hover hover:text-r5-text-primary"
          >
            Copy @handle
          </button>
        ) : null}
      </div>
      {isSelf ? (
        <p className="mt-2 text-[10px] text-r5-text-tertiary">This is you — share your contact from Clerk.</p>
      ) : (
        <p className="mt-2 text-[10px] text-r5-text-tertiary">
          Directory from your workspace. Use Email to reach them outside Route5.
        </p>
      )}
    </div>
  );
}
