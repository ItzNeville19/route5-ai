import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { getServiceClient } from "@/lib/supabase/server";
import { enforceRateLimits, getClientIp } from "@/lib/security/request-guards";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().trim().email().max(320),
  source: z.enum(["footer", "contact", "landing"]).optional(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limited = enforceRateLimits(req, [
    { key: `email-subscribe:ip:${ip}`, limit: 8, windowMs: 86_400_000 },
  ]);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  const source = parsed.data.source ?? "footer";

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Subscriptions are not available in this environment." },
      { status: 503 }
    );
  }

  try {
    const supabase = getServiceClient();
    const { error } = await supabase.from("marketing_email_subscribers").insert({
      email,
      source,
    });
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[email-subscribe]", e);
    return NextResponse.json({ error: "Could not save subscription." }, { status: 500 });
  }
}
