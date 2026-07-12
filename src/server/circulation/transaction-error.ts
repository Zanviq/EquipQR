import { DomainError } from "@/server/domain/errors";

export function mapTransactionError(error: unknown): never {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code === "P2002" || code === "P2034") {
    throw new DomainError("STATE_CONFLICT", "다른 작업으로 장비 상태가 변경되었습니다. 다시 스캔해 주세요.", 409);
  }
  throw error;
}
