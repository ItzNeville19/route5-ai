import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth/require-user";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { hasRecentNotificationByType } from "@/lib/notifications/store";
import { sendNotification } from "@/lib/notifications/service";

export const runtime = "nodejs";

function deviceLabel(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  const os = ua.includes("mac os")
    ? "macOS"
    : ua.includes("windows")
      ? "Windows"
      : ua.includes("android")
        ? "Android"
        : ua.includes("iphone") || ua.includes("ipad")
          ? "iOS"
          : ua.includes("linux")
            ? "Linux"
            : "Unknown OS";
  const browser = ua.includes("edg/")
    ? "Edge"
    : ua.includes("chrome/")
      ? "Chrome"
      : ua.includes("safari/") && !ua.includes("chrome/")
        ? "Safari"
        : ua.includes("firefox/")
          ? "Firefox"
          : "Unknown browser";
  return `${browser} on ${os}`;
}

function maskedIp(raw: string): string {
  const ip = raw.trim();
  if (!ip) return "Unknown IP";
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.x.x`;
  }
  return ip.slice(0, 12);
}

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

  try {
    const alreadySent = await hasRecentNotificationByType({
      userId,
      type: "security_login_alert",
      withinMinutes: 240,
    });
    if (alreadySent) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const orgId = await ensureOrganizationForClerkUser(userId);
    const userAgent = req.headers.get("user-agent") ?? "";
    const forwardedFor = req.headers.get("x-forwarded-for") ?? "";
    const firstIp = forwardedFor.split(",")[0] ?? "";
    const signInAt = new Date().toLocaleString();
    const device = deviceLabel(userAgent);
    const location = maskedIp(firstIp);

    await sendNotification({
      orgId,
      userId,
      type: "security_login_alert",
      title: "New sign-in detected",
      body: `We noticed a sign-in to your Route5 workspace from ${device} (${location}). If this was you, no action is needed.`,
      metadata: {
        signInAt,
        device,
        location,
        link: "/settings",
      },
      forceChannels: {
        inApp: true,
        email: true,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not send login alert";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
