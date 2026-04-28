import { NextResponse } from "next/server";

const LEGACY_DMG = "Route5-mac.dmg";

export async function GET(req: Request, ctx: { params: Promise<{ filename: string }> }) {
  const { filename } = await ctx.params;
  const env = process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL?.trim();

  if (filename === LEGACY_DMG && env) {
    return NextResponse.redirect(env, 302);
  }

  const fallback = new URL("/download", req.url);
  /* Preserve legacy path in case logs or analytics expect it. */
  if (filename === LEGACY_DMG) {
    fallback.searchParams.set("from", "installer-legacy");
  }
  return NextResponse.redirect(fallback, 302);
}
