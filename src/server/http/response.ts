import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError } from "@/server/domain/errors";

function prismaErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";
}

export function domainErrorResponse(error: unknown) {
  if (error instanceof DomainError) {
    return NextResponse.json({ code: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof SyntaxError || error instanceof ZodError) {
    return NextResponse.json(
      { code: "INVALID_REQUEST", message: "요청 형식을 확인해 주세요." },
      { status: 400 }
    );
  }
  const code = prismaErrorCode(error);
  if (code === "P2002") {
    return NextResponse.json(
      { code: "DUPLICATE_RESOURCE", message: "이미 등록된 값입니다." },
      { status: 409 }
    );
  }
  if (code === "P2003" || code === "P2034") {
    return NextResponse.json(
      { code: "STATE_CONFLICT", message: "현재 상태와 충돌하는 요청입니다. 다시 시도해 주세요." },
      { status: 409 }
    );
  }
  if (code === "P2025") {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "요청한 대상을 찾을 수 없습니다." },
      { status: 404 }
    );
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
