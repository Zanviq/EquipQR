import { prisma } from "@/server/db/client";
import { DomainError } from "@/server/domain/errors";
import { mapTransactionError } from "@/server/circulation/transaction-error";
import { completeTransfer } from "./complete-transfer";

export async function instantTransfer(input: { publicCode: string; recipientUserId: string; now?: Date }) {
  const now = input.now ?? new Date();
  try {
    return await prisma.$transaction(async (tx) => {
      const equipment = await tx.equipment.findUnique({ where: { publicCode: input.publicCode } });
      if (!equipment || equipment.retiredAt) throw new DomainError("EQUIPMENT_NOT_FOUND", "장비를 찾을 수 없습니다.", 404);
      if (equipment.operationalStatus === "OUT_OF_SERVICE") {
        throw new DomainError("EQUIPMENT_OUT_OF_SERVICE", "사용 중지된 장비입니다.", 409);
      }
      const active = await tx.assignment.findFirst({ where: { equipmentId: equipment.id, endedAt: null } });
      if (!active) throw new DomainError("STATE_CONFLICT", "현재 대여 중인 장비가 아닙니다.", 409);
      if (active.transferModeSnapshot !== "INSTANT_EQUIPMENT_QR") {
        throw new DomainError("TRANSFER_QR_REQUIRED", "현재 사용자에게 전달 QR을 요청해 주세요.", 409);
      }
      return completeTransfer(tx, {
        equipmentId: equipment.id,
        fromAssignmentId: active.id,
        recipientUserId: input.recipientUserId,
        acquisitionType: "INSTANT_QR",
        now
      });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    mapTransactionError(error);
  }
}
