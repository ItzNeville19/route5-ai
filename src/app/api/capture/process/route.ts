import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { processCaptureText } from "@/lib/capture/process-capture-text";
import {
  enforceRateLimits,
  extractionProviderSchema,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    text: z.string().min(1).max(100_000),
    extractionProviderId: extractionProviderSchema.optional(),
  })
  .strict();

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

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
    const result = await processCaptureText(
      parsed.data.text,
      parsed.data.extractionProviderId,
      { userId }
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
