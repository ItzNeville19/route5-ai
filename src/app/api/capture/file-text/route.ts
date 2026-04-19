import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { requireUserId } from "@/lib/auth/require-user";
import { publicWorkspaceError } from "@/lib/public-api-message";
import { enforceRateLimits, userAndIpRateScopes } from "@/lib/security/request-guards";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function supportedFileError(name: string): NextResponse {
  return NextResponse.json(
    {
      error: `Unsupported file type for ${name}. Upload PDF, TXT, MD, EML, CSV, or JSON.`,
    },
    { status: 415 }
  );
}

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;

  const rateLimited = enforceRateLimits(
    req,
    userAndIpRateScopes(req, "capture:file-text", userId, {
      userLimit: 25,
      ipLimit: 45,
      userWindowMs: 60_000,
      ipWindowMs: 60_000,
    })
  );
  if (rateLimited) return rateLimited;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: "File is empty." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds 8MB limit for capture import." },
        { status: 413 }
      );
    }

    const lowerName = file.name.toLowerCase();
    const mime = file.type.toLowerCase();
    const raw = Buffer.from(await file.arrayBuffer());

    if (
      mime === "application/pdf" ||
      lowerName.endsWith(".pdf")
    ) {
      const parser = new PDFParse({ data: raw });
      try {
        const parsed = await parser.getText();
        const text = parsed.text?.trim() ?? "";
        if (!text) {
          return NextResponse.json(
            { error: "Could not extract text from this PDF." },
            { status: 422 }
          );
        }
        return NextResponse.json({ text });
      } finally {
        await parser.destroy();
      }
    }

    if (
      mime.startsWith("text/") ||
      lowerName.endsWith(".txt") ||
      lowerName.endsWith(".md") ||
      lowerName.endsWith(".eml") ||
      lowerName.endsWith(".csv") ||
      lowerName.endsWith(".json")
    ) {
      const text = raw.toString("utf8").trim();
      if (!text) {
        return NextResponse.json(
          { error: "No readable text found in this file." },
          { status: 422 }
        );
      }
      return NextResponse.json({ text });
    }

    return supportedFileError(file.name);
  } catch (e) {
    return NextResponse.json({ error: publicWorkspaceError(e) }, { status: 503 });
  }
}
