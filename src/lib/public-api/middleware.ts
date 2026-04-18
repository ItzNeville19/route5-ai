import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { validateApiKey, type ValidatedApiKey } from "@/lib/public-api/keys";
import { checkApiKeyRateLimit, publicApiRateLimitPerMinute } from "@/lib/public-api/rate-limit";
import type { ApiScope } from "@/lib/public-api/types";
import { jsonError } from "@/lib/public-api/response";

export type PublicApiContext = ValidatedApiKey & {
  requestId: string;
};

function extractBearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim() || null;
}

export function hasScope(scopes: ApiScope[], need: ApiScope): boolean {
  if (need === "read") return scopes.includes("read") || scopes.includes("write");
  if (need === "write") return scopes.includes("write");
  if (need === "webhooks") return scopes.includes("webhooks");
  return false;
}

export async function authenticatePublicApi(
  req: NextRequest,
  requiredScope: ApiScope
): Promise<{ ok: true; ctx: PublicApiContext } | { ok: false; response: NextResponse }> {
  const requestId = crypto.randomUUID();
  const token = extractBearer(req);
  if (!token) {
    return {
      ok: false,
      response: jsonError(requestId, 401, "unauthorized", "Missing or invalid Authorization Bearer token"),
    };
  }
  const validated = await validateApiKey(token);
  if (!validated) {
    return {
      ok: false,
      response: jsonError(requestId, 401, "unauthorized", "Invalid or revoked API key"),
    };
  }
  if (!hasScope(validated.scopes, requiredScope)) {
    return {
      ok: false,
      response: jsonError(requestId, 403, "forbidden", "Insufficient scope for this endpoint"),
    };
  }
  const rl = checkApiKeyRateLimit(validated.keyId, publicApiRateLimitPerMinute());
  if (!rl.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: {
            code: "rate_limited",
            message: "Too many requests",
          },
          meta: { request_id: requestId, timestamp: new Date().toISOString() },
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec ?? 60) },
        }
      ),
    };
  }

  const ctx: PublicApiContext = { ...validated, requestId };
  return { ok: true, ctx };
}

export function logPublicApiResponse(
  ctx: PublicApiContext,
  req: NextRequest,
  status: number,
  startedMs: number
): void {
  console.log(
    JSON.stringify({
      public_api: true,
      org_id: ctx.orgId,
      key_id: ctx.keyId,
      path: req.nextUrl.pathname,
      method: req.method,
      request_id: ctx.requestId,
      status,
      latency_ms: Date.now() - startedMs,
    })
  );
}

export async function withPublicApi(
  req: NextRequest,
  scope: ApiScope,
  handler: (ctx: PublicApiContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const started = Date.now();
  const auth = await authenticatePublicApi(req, scope);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;
  try {
    const res = await handler(ctx);
    logPublicApiResponse(ctx, req, res.status, started);
    return res;
  } catch (e) {
    logPublicApiResponse(ctx, req, 500, started);
    const msg = e instanceof Error ? e.message : "Server error";
    return jsonError(ctx.requestId, 500, "internal_error", msg);
  }
}
