import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { figmaFileKeyFromInput, fetchFigmaFileForImport, isFigmaConfigured } from "@/lib/figma-api";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  cleanText,
  enforceRateLimits,
  parseJsonBody,
  userAndIpRateScopes,
} from "@/lib/security/request-guards";

export const runtime = "nodejs";

const figmaImportSchema = z
  .object({
    input: z
      .string()
      .transform(cleanText)
      .pipe(z.string().min(1, "Paste a Figma file or design link, or the file key.").max(2000)),
  })
  .strict();

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "figma:get", userId, {
      userLimit: 60,
      ipLimit: 120,
    })
  );
  if (rateLimited) return rateLimited;

  return NextResponse.json({
    configured: isFigmaConfigured(),
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "figma:post", userId, {
      userLimit: 24,
      ipLimit: 48,
    })
  );
  if (rateLimited) return rateLimited;

  const parsed = await parseJsonBody(req, figmaImportSchema);
  if (!parsed.ok) return parsed.response;

  const fileKey = figmaFileKeyFromInput(parsed.data.input);
  if (!fileKey) {
    return NextResponse.json(
      { error: "Could not read a Figma file key from that link. Use a file, design, or community file URL." },
      { status: 400 }
    );
  }

  if (!isFigmaConfigured()) {
    return NextResponse.json(
      {
        error:
          "Figma API is not configured. Add FIGMA_ACCESS_TOKEN (personal access token with file read access) to your server environment, then restart.",
      },
      { status: 503 }
    );
  }

  try {
    const res = await fetchFigmaFileForImport(fileKey);
    if (!res.ok) {
      let status = 422;
      if (res.error.includes("403")) status = 403;
      else if (/not found/i.test(res.error)) status = 404;
      return NextResponse.json({ error: res.error }, { status });
    }
    return NextResponse.json({
      title: res.title,
      fileKey: res.fileKey,
      bodyForExtraction: res.body,
    });
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
