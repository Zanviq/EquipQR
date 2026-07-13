import { prisma } from "@/server/db/client";
import { normalizeEmployeeNumber } from "@/server/auth/employee-number";
import { hashPassword } from "@/server/auth/password";
import { DomainError } from "@/server/domain/errors";
import { runSerializableTransaction } from "@/server/db/serializable-transaction";
import { requireAdmin } from "./guard";

export async function createUser(input: { adminUserId: string; employeeNumber: string; name: string; password: string; role?: "EMPLOYEE" | "ADMIN" }) {
  if (input.password.length < 12) throw new DomainError("WEAK_PASSWORD", "비밀번호는 12자 이상이어야 합니다.");
  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    await requireAdmin(tx, input.adminUserId);
    const user = await tx.user.create({ data: {
      employeeNumber: normalizeEmployeeNumber(input.employeeNumber),
      name: input.name.trim(),
      passwordHash,
      role: input.role ?? "EMPLOYEE"
    } });
    await tx.auditEvent.create({ data: { eventType: "USER_CREATED", actorUserId: input.adminUserId, nextUserId: user.id } });
    return user;
  });
}

export async function setUserStatus(input: { adminUserId: string; userId: string; status: "ACTIVE" | "INACTIVE" }) {
  return runSerializableTransaction(async (tx) => {
    const admin = await requireAdmin(tx, input.adminUserId);
    if (input.status === "INACTIVE" && admin.id === input.userId) throw new DomainError("SELF_DEACTIVATION", "자신의 관리자 계정은 비활성화할 수 없습니다.", 409);
    const target = await tx.user.findUnique({ where: { id: input.userId } });
    if (!target) throw new DomainError("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.", 404);
    if (input.status === "INACTIVE" && target.role === "ADMIN") {
      const activeAdmins = await tx.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
      if (activeAdmins <= 1) throw new DomainError("LAST_ADMIN", "마지막 활성 관리자는 비활성화할 수 없습니다.", 409);
    }
    const user = await tx.user.update({ where: { id: input.userId }, data: { status: input.status } });
    if (input.status === "INACTIVE") {
      await tx.session.updateMany({ where: { userId: input.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    await tx.auditEvent.create({
      data: { eventType: "USER_UPDATED", actorUserId: input.adminUserId, nextUserId: user.id, metadata: { status: input.status } }
    });
    return user;
  });
}

export async function resetUserPassword(input: { adminUserId: string; userId: string; password: string }) {
  if (input.password.length < 12) throw new DomainError("WEAK_PASSWORD", "비밀번호는 12자 이상이어야 합니다.");
  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    await requireAdmin(tx, input.adminUserId);
    const user = await tx.user.update({ where: { id: input.userId }, data: { passwordHash, passwordChangedAt: new Date() } });
    await tx.session.updateMany({ where: { userId: input.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.auditEvent.create({ data: { eventType: "PASSWORD_RESET", actorUserId: input.adminUserId, nextUserId: user.id } });
    return user;
  });
}
