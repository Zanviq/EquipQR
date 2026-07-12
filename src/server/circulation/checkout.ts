import { prisma } from "@/server/db/client";
import { DomainError } from "@/server/domain/errors";
import { mapTransactionError } from "./transaction-error";

export interface CheckoutInput {
  publicCode: string;
  actorUserId: string;
}

export async function checkoutEquipment(input: CheckoutInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const [equipment, user] = await Promise.all([
        tx.equipment.findUnique({ where: { publicCode: input.publicCode } }),
        tx.user.findUnique({ where: { id: input.actorUserId } })
      ]);
      if (!equipment || equipment.retiredAt) throw new DomainError("EQUIPMENT_NOT_FOUND", "장비를 찾을 수 없습니다.", 404);
      if (equipment.operationalStatus === "OUT_OF_SERVICE") {
        throw new DomainError("EQUIPMENT_OUT_OF_SERVICE", "사용 중지된 장비입니다.", 409);
      }
      if (!user || user.status !== "ACTIVE") throw new DomainError("ACCOUNT_INACTIVE", "사용할 수 없는 계정입니다.", 403);
      if (await tx.assignment.findFirst({ where: { equipmentId: equipment.id, endedAt: null } })) {
        throw new DomainError("ALREADY_CHECKED_OUT", "이미 다른 사용자가 대여 중입니다.", 409);
      }
      const assignment = await tx.assignment.create({
        data: {
          equipmentId: equipment.id,
          userId: user.id,
          transferModeSnapshot: user.defaultTransferMode,
          acquisitionType: "CHECKOUT"
        }
      });
      await tx.auditEvent.create({
        data: {
          eventType: "CHECKOUT",
          equipmentId: equipment.id,
          actorUserId: user.id,
          nextUserId: user.id,
          assignmentId: assignment.id
        }
      });
      return { equipment, assignment };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    mapTransactionError(error);
  }
}
