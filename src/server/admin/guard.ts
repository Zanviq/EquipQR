import type { Prisma } from "@/generated/prisma/client";
import { DomainError } from "@/server/domain/errors";

export async function requireAdmin(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "ACTIVE" || user.role !== "ADMIN") {
    throw new DomainError("FORBIDDEN", "관리자 권한이 필요합니다.", 403);
  }
  return user;
}
