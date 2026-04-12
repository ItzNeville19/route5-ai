import { NextResponse } from "next/server";
import { z } from "zod";

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitConfig = {
  key: string;
  limit: number;
  windowMs: number;
};

const memoryBuckets = new Map<string, Bucket>();

export const SAFE_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\u0000/g, ""],
  [/\r\n/g, "\n"],
  [/\r/g, "\n"],
];

export function cleanText(input: string): string {
  let value = input.normalize("NFKC");
  for (const [pattern, replacement] of SAFE_TEXT_REPLACEMENTS) {
    value = value.replace(pattern, replacement);
  }
  return value.trim();
}

export function jsonError(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function applyRateLimit(config: RateLimitConfig): {
  ok: true;
  remaining: number;
  resetAt: number;
} | {
  ok: false;
  retryAfterSeconds: number;
  headers: Record<string, string>;
} {
  const now = Date.now();
  const existing = memoryBuckets.get(config.key);
  const bucket =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + config.windowMs }
      : existing;

  if (bucket.count >= config.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return {
      ok: false,
      retryAfterSeconds,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    };
  }

  bucket.count += 1;
  memoryBuckets.set(config.key, bucket);
  return {
    ok: true,
    remaining: Math.max(0, config.limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export function enforceRateLimits(req: Request, scopes: RateLimitConfig[]) {
  for (const scope of scopes) {
    const result = applyRateLimit(scope);
    if (!result.ok) {
      return jsonError(
        "Too many requests. Please wait a moment and try again.",
        429,
        result.headers
      );
    }
  }
  return null;
}

/** Hard cap for JSON API bodies — reduces accidental / malicious huge payloads (DoS). */
export const MAX_JSON_BODY_BYTES = 1_048_576;

const workspaceUuidSchema = z.string().uuid();

export function isWorkspaceResourceId(id: string): boolean {
  return workspaceUuidSchema.safeParse(id).success;
}

export async function parseJsonBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, response: jsonError("Could not read request body", 400) };
  }

  if (text.length > MAX_JSON_BODY_BYTES) {
    return { ok: false, response: jsonError("Request body too large", 413) };
  }

  let raw: unknown;
  try {
    raw = text.length === 0 ? null : JSON.parse(text);
  } catch {
    return { ok: false, response: jsonError("Invalid JSON body", 400) };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError(parsed.error.issues[0]?.message || "Invalid request body", 400),
    };
  }
  return { ok: true, data: parsed.data };
}

export function userAndIpRateScopes(
  req: Request,
  routeName: string,
  userId: string,
  opts?: {
    userLimit?: number;
    userWindowMs?: number;
    ipLimit?: number;
    ipWindowMs?: number;
  }
): RateLimitConfig[] {
  const ip = getClientIp(req);
  return [
    {
      key: `${routeName}:user:${userId}`,
      limit: opts?.userLimit ?? 60,
      windowMs: opts?.userWindowMs ?? 60_000,
    },
    {
      key: `${routeName}:ip:${ip}`,
      limit: opts?.ipLimit ?? 120,
      windowMs: opts?.ipWindowMs ?? 60_000,
    },
  ];
}

export const projectNameSchema = z
  .string()
  .transform(cleanText)
  .pipe(
    z
      .string()
      .min(1, "name is required")
      .max(120, "name must be 120 characters or less")
  );

export const iconEmojiSchema = z
  .string()
  .transform(cleanText)
  .pipe(z.string().max(16, "iconEmoji must be 16 characters or less"))
  .transform((value) => [...value][0] ?? "");

export const extractionProviderSchema = z
  .string()
  .transform(cleanText)
  .pipe(z.string().max(80, "extractionProviderId must be 80 characters or less"));

export const shortcutSchema = z.object({
  label: z.string().transform(cleanText).pipe(z.string().min(1).max(24)),
  href: z.string().startsWith("/").max(120),
});
