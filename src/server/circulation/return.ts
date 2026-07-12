import { prisma } from "@/server/db/client";
import { DomainError } from "@/server/domain/errors";
import { mapTransactionError } from "./transaction-error";

export interface ReturnInput {
  publicCode: string;
  actorUserId: string;
}

export async function returnEquipment(input: ReturnInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const equipment = await tx.equipment.findUnique({ where: { publicCode: input.publicCode } });
      if (!equipment || equipment.retiredAt) throw new DomainError("EQUIPMENT_NOT_FOUND", "장비를 찾을 수 없습니다.", 404);
      if (equipment.operationalStatus === "OUT_OF_SERVICE") {
        throw new DomainError("EQUIPMENT_OUT_OF_SERVICE", "사용 중지된 장비입니다.", 409);
      }
      const active = await tx.assignment.findFirst({ where: { equipmentId: equipment.id, endedAt: null } });
      if (!active || active.userId !== input.actorUserId) {
        throw new DomainError("NOT_CURRENT_HOLDER", "현재 사용자만 반납할 수 있습니다.", 403);
      }
      const endedAt = new Date();
      const assignment = await tx.assignment.update({ where: { id: active.id }, data: { endedAt } });
      await tx.transferTicket.updateMany({
        where: { equipmentId: equipment.id, usedAt: null, cancelledAt: null },
        data: { cancelledAt: endedAt }
      });
      await tx.auditEvent.create({
        data: {
          eventType: "RETURN",
          equipmentId: equipment.id,
          actorUserId: input.actorUserId,
          previousUserId: input.actorUserId,
          assignmentId: assignment.id
        }
      });
      return { equipment, assignment };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    mapTransactionError(error);
  }
}
