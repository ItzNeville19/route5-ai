/** Deterministic muted background for initials fallback (matches feed row style). */
export function ownerAccentBg(ownerId: string): string {
  if (!ownerId.trim()) return "";
  let h = 0;
  for (let i = 0; i < ownerId.length; i++) h = (h * 31 + ownerId.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 42% 36%)`;
}
