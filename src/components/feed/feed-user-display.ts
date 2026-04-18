/** Shared helpers for showing owner labels from Clerk user vs opaque IDs. */

type ClerkUserLike = {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
};

export function clerkDisplayName(user: ClerkUserLike | null | undefined): string {
  if (!user) return "";
  const full = user.fullName?.trim();
  if (full) return full;
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  const un = user.username?.trim();
  if (un) return un;
  const email = user.primaryEmailAddress?.emailAddress;
  if (email) {
    const local = email.split("@")[0];
    if (local) return local;
  }
  return "";
}

/** Initials for the signed-in user — never derives from the fallback label "You". */
export function clerkSelfInitials(user: ClerkUserLike | null | undefined): string {
  if (!user) return "?";
  const full = user.fullName?.trim();
  if (full && full.toLowerCase() !== "you") return initialsFromDisplayName(full);
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  if (first && first.length >= 2 && first.toLowerCase() !== "you") return first.slice(0, 2).toUpperCase();
  if (first && first.toLowerCase() !== "you") return `${first[0] ?? "?"}${first[0] ?? "?"}`.toUpperCase();
  const email = user.primaryEmailAddress?.emailAddress?.split("@")[0];
  if (email && email.length >= 2) return email.slice(0, 2).toUpperCase();
  if (email && email.length === 1) return `${email[0]}${email[0]}`.toUpperCase();
  const un = user.username?.trim();
  if (un && un.length >= 2) return un.slice(0, 2).toUpperCase();
  return "?";
}

export function initialsFromDisplayName(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  if (t.toLowerCase() === "you") return "ME";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? "";
    const b = parts[parts.length - 1][0] ?? "";
    return (a + b).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

export function ownerInitialsFromId(
  ownerId: string,
  selfId: string | undefined,
  selfDisplayName: string,
  selfInitialsOverride: string
): string {
  if (!ownerId.trim()) return "+";
  if (selfId && ownerId === selfId) {
    if (selfInitialsOverride && selfInitialsOverride !== "?") return selfInitialsOverride;
    if (selfDisplayName.trim() && selfDisplayName.trim().toLowerCase() !== "you") {
      return initialsFromDisplayName(selfDisplayName);
    }
    return "ME";
  }
  const alnum = ownerId.replace(/[^a-zA-Z0-9]/g, "");
  if (alnum.length >= 2) return alnum.slice(0, 2).toUpperCase();
  if (ownerId.length >= 2) return ownerId.slice(0, 2).toUpperCase();
  return "?";
}

export function ownerHoverLabelFromId(
  ownerId: string,
  selfId: string | undefined,
  selfDisplayName: string
): string {
  if (!ownerId.trim()) return "Unassigned";
  if (selfId && ownerId === selfId) {
    const d = selfDisplayName.trim();
    if (d) return d;
    return "You";
  }
  return ownerId.length > 18 ? `${ownerId.slice(0, 16)}…` : ownerId;
}
