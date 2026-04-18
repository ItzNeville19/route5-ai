import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { processCaptureText } from "@/lib/capture/process-capture-text";
import {
  enforceRateLimits,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    text: z.string().min(1).max(100_000),
  })
  .strict();

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "capture:process", userId, {
      userLimit: 40,
      ipLimit: 80,
      userWindowMs: 60_000,
      ipWindowMs: 60_000,
    })
  );
  if (rateLimited) return rateLimited;

  const parsed = await parseJsonBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await processCaptureText(parsed.data.text);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
