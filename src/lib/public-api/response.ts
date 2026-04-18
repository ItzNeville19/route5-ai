import { NextResponse } from "next/server";

export function requestMeta(requestId: string) {
  return {
    request_id: requestId,
    timestamp: new Date().toISOString(),
  };
}

export function jsonSuccess<T>(
  data: T,
  requestId: string,
  extraMeta?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({
    data,
    meta: { ...requestMeta(requestId), ...extraMeta },
  });
}

export function jsonListSuccess<T>(
  data: T[],
  requestId: string,
  listMeta: { total: number; limit: number; offset: number }
): NextResponse {
  return NextResponse.json({
    data,
    meta: { ...requestMeta(requestId), ...listMeta },
  });
}

export function jsonError(
  requestId: string,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error: { code, message, ...(details ? { details } : {}) },
      meta: requestMeta(requestId),
    },
    { status }
  );
}
