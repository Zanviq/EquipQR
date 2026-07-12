import { NextResponse } from "next/server";
import { DomainError } from "@/server/domain/errors";

export function domainErrorResponse(error: unknown) {
  if (error instanceof DomainError) {
    return NextResponse.json({ code: error.code, message: error.message }, { status: error.status });
  }
  const trackingId = crypto.randomUUID();
  console.error("Unexpected request error", { trackingId, error });
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "요청을 처리하지 못했습니다.", trackingId },
    { status: 500 }
  );
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_ORIGIN;
  if (origin && expected && new URL(origin).origin !== new URL(expected).origin) {
    throw new DomainError("INVALID_ORIGIN", "허용되지 않은 요청입니다.", 403);
  }
}
