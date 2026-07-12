import { prisma } from "@/server/db/client";
import { DomainError } from "@/server/domain/errors";

export async function cancelTransferTicket(input: { ticketId: string; actorUserId: string; now?: Date }) {
  const now = input.now ?? new Date();
  return prisma.$transaction(async (tx) => {
    const [ticket, actor] = await Promise.all([
      tx.transferTicket.findUnique({ where: { id: input.ticketId }, include: { fromAssignment: true } }),
      tx.user.findUnique({ where: { id: input.actorUserId } })
    ]);
    if (!ticket) throw new DomainError("TRANSFER_NOT_FOUND", "전달 QR을 찾을 수 없습니다.", 404);
    if (!actor || (actor.role !== "ADMIN" && ticket.fromAssignment.userId !== actor.id)) {
      throw new DomainError("NOT_CURRENT_HOLDER", "현재 사용자만 전달 QR을 취소할 수 있습니다.", 403);
    }
    if (ticket.usedAt || ticket.cancelledAt) throw new DomainError("TRANSFER_USED", "이미 종료된 전달 QR입니다.", 409);
    const result = await tx.transferTicket.updateMany({ where: { id: ticket.id, usedAt: null, cancelledAt: null }, data: { cancelledAt: now } });
    if (result.count !== 1) throw new DomainError("TRANSFER_USED", "이미 종료된 전달 QR입니다.", 409);
    await tx.auditEvent.create({
      data: {
        eventType: "TRANSFER_TICKET_CANCELLED",
        equipmentId: ticket.equipmentId,
        actorUserId: actor.id,
        assignmentId: ticket.fromAssignmentId,
        transferTicketId: ticket.id
      }
    });
    return tx.transferTicket.findUniqueOrThrow({ where: { id: ticket.id } });
  });
}
