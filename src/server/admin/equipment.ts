import { prisma } from "@/server/db/client";
import { createPublicCode } from "@/server/equipment/public-code";
import { normalizeAssetNumber } from "@/server/equipment/asset-number";
import { DomainError } from "@/server/domain/errors";
import { requireAdmin } from "./guard";
import { mapTransactionError } from "@/server/circulation/transaction-error";

export async function updateEquipmentDetails(input: { adminUserId: string; equipmentId: string; name: string; note?: string }) {
  return prisma.$transaction(async (tx) => {
    await requireAdmin(tx, input.adminUserId);
    const equipment = await tx.equipment.update({ where: { id: input.equipmentId }, data: { name: input.name.trim(), note: input.note?.trim() || null } });
    await tx.auditEvent.create({ data: { eventType: "EQUIPMENT_UPDATED", equipmentId: equipment.id, actorUserId: input.adminUserId } });
    return equipment;
  });
}

export async function createEquipment(input: { adminUserId: string; assetNumber: string; name: string; note?: string }) {
  return prisma.$transaction(async (tx) => {
    await requireAdmin(tx, input.adminUserId);
    const equipment = await tx.equipment.create({ data: {
      assetNumber: normalizeAssetNumber(input.assetNumber),
      name: input.name.trim(),
      note: input.note?.trim() || null,
      publicCode: createPublicCode()
    } });
    await tx.auditEvent.create({ data: { eventType: "EQUIPMENT_CREATED", equipmentId: equipment.id, actorUserId: input.adminUserId } });
    return equipment;
  });
}

export async function setEquipmentStatus(input: { adminUserId: string; equipmentId: string; status: "ACTIVE" | "OUT_OF_SERVICE"; reason: string }) {
  if (!input.reason.trim()) throw new DomainError("REASON_REQUIRED", "변경 사유를 입력해 주세요.");
  return prisma.$transaction(async (tx) => {
    await requireAdmin(tx, input.adminUserId);
    const equipment = await tx.equipment.update({ where: { id: input.equipmentId }, data: { operationalStatus: input.status } });
    if (input.status === "OUT_OF_SERVICE") {
      await tx.transferTicket.updateMany({ where: { equipmentId: equipment.id, usedAt: null, cancelledAt: null }, data: { cancelledAt: new Date() } });
    }
    await tx.auditEvent.create({ data: { eventType: "STATUS_CHANGED", equipmentId: equipment.id, actorUserId: input.adminUserId, reason: input.reason.trim(), metadata: { status: input.status } } });
    return equipment;
  });
}

export async function changeResponsibility(input: { adminUserId: string; equipmentId: string; nextUserId?: string | null; reason: string }) {
  if (!input.reason.trim()) throw new DomainError("REASON_REQUIRED", "변경 사유를 입력해 주세요.");
  try { return await prisma.$transaction(async (tx) => {
    await requireAdmin(tx, input.adminUserId);
    const equipment = await tx.equipment.findUnique({ where: { id: input.equipmentId } });
    if (!equipment) throw new DomainError("EQUIPMENT_NOT_FOUND", "장비를 찾을 수 없습니다.", 404);
    const active = await tx.assignment.findFirst({ where: { equipmentId: equipment.id, endedAt: null } });
    const now = new Date();
    if (active) await tx.assignment.update({ where: { id: active.id }, data: { endedAt: now } });
    await tx.transferTicket.updateMany({ where: { equipmentId: equipment.id, usedAt: null, cancelledAt: null }, data: { cancelledAt: now } });
    let nextAssignment = null;
    if (input.nextUserId) {
      const next = await tx.user.findUnique({ where: { id: input.nextUserId } });
      if (!next || next.status !== "ACTIVE") throw new DomainError("ACCOUNT_INACTIVE", "사용할 수 없는 계정입니다.", 409);
      nextAssignment = await tx.assignment.create({ data: {
        equipmentId: equipment.id,
        userId: next.id,
        transferModeSnapshot: next.defaultTransferMode,
        acquisitionType: "ADMIN"
      } });
    }
    await tx.auditEvent.create({ data: {
      eventType: input.nextUserId ? "ADMIN_REASSIGN" : "ADMIN_RECALL",
      equipmentId: equipment.id,
      actorUserId: input.adminUserId,
      previousUserId: active?.userId,
      nextUserId: input.nextUserId || null,
      assignmentId: nextAssignment?.id,
      reason: input.reason.trim()
    } });
    return { equipment, previousAssignment: active, nextAssignment };
  }, { isolationLevel: "Serializable" }); }
  catch (error) { mapTransactionError(error); }
}
