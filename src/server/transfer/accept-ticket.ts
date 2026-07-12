import { prisma } from "@/server/db/client";
import { DomainError } from "@/server/domain/errors";
import { mapTransactionError } from "@/server/circulation/transaction-error";
import { completeTransfer } from "./complete-transfer";
import { hashTransferToken } from "./token";

export async function acceptTransferTicket(input: { token: string; recipientUserId: string; now?: Date }) {
  const now = input.now ?? new Date();
  try {
    return await prisma.$transaction(async (tx) => {
      const ticket = await tx.transferTicket.findUnique({ where: { tokenHash: hashTransferToken(input.token) } });
      if (!ticket) throw new DomainError("TRANSFER_NOT_FOUND", "전달 QR을 확인할 수 없습니다.", 404);
      if (ticket.usedAt || ticket.cancelledAt) throw new DomainError("TRANSFER_USED", "이미 사용되었거나 취소된 전달 QR입니다.", 409);
      if (ticket.expiresAt <= now) throw new DomainError("TRANSFER_EXPIRED", "전달 QR이 만료되었습니다.", 410);
      return completeTransfer(tx, {
        equipmentId: ticket.equipmentId,
        fromAssignmentId: ticket.fromAssignmentId,
        recipientUserId: input.recipientUserId,
        acquisitionType: "TRANSFER_QR",
        ticketId: ticket.id,
        now
      });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    mapTransactionError(error);
  }
}
