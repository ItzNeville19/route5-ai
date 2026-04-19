"use client";

import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useMemberDirectory } from "@/components/workspace/MemberProfilesProvider";
import { ownerAccentBg } from "@/lib/people/owner-avatar-style";
import { ownerInitialsFromId } from "@/components/feed/feed-user-display";

type Props = {
  userId: string;
  size?: number;
  selfDisplayName: string;
  selfInitials: string;
  className?: string;
  title?: string;
};

/**
 * Clerk photo when available (from org directory API), otherwise initials.
 */
export default function MemberAvatar({
  userId,
  size = 24,
  selfDisplayName,
  selfInitials,
  className = "",
  title,
}: Props) {
  const { user } = useUser();
  const { get } = useMemberDirectory();
  const selfId = user?.id;
  const profile = get(userId);
  const isSelf = Boolean(selfId && userId === selfId);
  const src = isSelf ? user?.imageUrl ?? null : profile?.imageUrl ?? null;
  const initials = ownerInitialsFromId(userId, selfId, selfDisplayName, selfInitials);
  const dim = Math.round(size);

  if (src) {
    return (
      <span
        className={`relative inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-white/10 ${className}`}
        style={{ width: dim, height: dim }}
        title={title}
      >
        <Image
          src={src}
          alt=""
          width={dim}
          height={dim}
          className="object-cover"
          unoptimized={src.includes("gravatar") || src.includes("googleusercontent")}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-[length:var(--r5-font-kbd)] font-semibold text-white ring-1 ring-white/10 ${className}`}
      style={{
        width: dim,
        height: dim,
        backgroundColor: ownerAccentBg(userId),
        fontSize: Math.max(9, dim * 0.38),
      }}
      title={title}
    >
      {initials}
    </span>
  );
}
