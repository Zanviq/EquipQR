import { prisma } from "@/server/db/client";
import { DomainError } from "@/server/domain/errors";
import { mapTransactionError } from "@/server/circulation/transaction-error";
import { createTransferToken, hashTransferToken, TRANSFER_TTL_MS } from "./token";

export async function issueTransferTicket(input: { equipmentId: string; actorUserId: string; now?: Date }) {
  const now = input.now ?? new Date();
  const rawValue = createTransferToken();
  const expiresAt = new Date(now.getTime() + TRANSFER_TTL_MS);
  try {
    const ticket = await prisma.$transaction(async (tx) => {
      const [assignment, equipment] = await Promise.all([
        tx.assignment.findFirst({ where: { equipmentId: input.equipmentId, endedAt: null } }),
        tx.equipment.findUnique({ where: { id: input.equipmentId } })
      ]);
      if (!equipment || equipment.operationalStatus !== "ACTIVE") {
        throw new DomainError("OUT_OF_SERVICE", "사용 중지된 장비입니다.", 409);
      }
      if (!assignment || assignment.userId !== input.actorUserId) {
        throw new DomainError("NOT_CURRENT_HOLDER", "현재 사용자만 전달 QR을 만들 수 있습니다.", 403);
      }
      if (assignment.transferModeSnapshot !== "TRANSFER_QR") {
        throw new DomainError("INSTANT_TRANSFER_ONLY", "이 장비는 장비 QR 즉시 전달 방식입니다.", 409);
      }
      await tx.transferTicket.updateMany({
        where: { equipmentId: input.equipmentId, usedAt: null, cancelledAt: null },
        data: { cancelledAt: now }
      });
      const created = await tx.transferTicket.create({
        data: {
          equipmentId: input.equipmentId,
          fromAssignmentId: assignment.id,
          createdByUserId: input.actorUserId,
          tokenHash: hashTransferToken(rawValue),
          expiresAt,
          createdAt: now
        }
      });
      await tx.auditEvent.create({
        data: {
          eventType: "TRANSFER_TICKET_CREATED",
          equipmentId: input.equipmentId,
          actorUserId: input.actorUserId,
          assignmentId: assignment.id,
          transferTicketId: created.id
        }
      });
      return created;
    }, { isolationLevel: "Serializable" });
    return { token: rawValue, ticketId: ticket.id, expiresAt };
  } catch (error) {
    mapTransactionError(error);
  }
}
