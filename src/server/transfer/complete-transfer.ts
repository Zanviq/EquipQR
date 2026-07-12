import type { AcquisitionType, Prisma } from "@/generated/prisma/client";
import { DomainError } from "@/server/domain/errors";

export interface CompleteTransferInput {
  equipmentId: string;
  fromAssignmentId: string;
  recipientUserId: string;
  acquisitionType: AcquisitionType;
  ticketId?: string;
  now?: Date;
}

export async function completeTransfer(tx: Prisma.TransactionClient, input: CompleteTransferInput) {
  const now = input.now ?? new Date();
  const [active, recipient, equipment] = await Promise.all([
    tx.assignment.findUnique({ where: { id: input.fromAssignmentId } }),
    tx.user.findUnique({ where: { id: input.recipientUserId } }),
    tx.equipment.findUnique({ where: { id: input.equipmentId } })
  ]);
  if (!equipment || equipment.operationalStatus !== "ACTIVE") throw new DomainError("OUT_OF_SERVICE", "사용 중지된 장비입니다.", 409);
  if (!active || active.equipmentId !== input.equipmentId || active.endedAt) {
    throw new DomainError("STATE_CONFLICT", "장비 책임자가 이미 변경되었습니다.", 409);
  }
  if (!recipient || recipient.status !== "ACTIVE") throw new DomainError("ACCOUNT_INACTIVE", "사용할 수 없는 계정입니다.", 403);
  if (active.userId === recipient.id) throw new DomainError("SAME_HOLDER", "현재 사용자에게 다시 전달할 수 없습니다.", 409);

  const previousAssignment = await tx.assignment.update({ where: { id: active.id }, data: { endedAt: now } });
  const nextAssignment = await tx.assignment.create({
    data: {
      equipmentId: input.equipmentId,
      userId: recipient.id,
      transferModeSnapshot: recipient.defaultTransferMode,
      acquisitionType: input.acquisitionType,
      startedAt: now
    }
  });
  if (input.ticketId) {
    const consumed = await tx.transferTicket.updateMany({
      where: { id: input.ticketId, usedAt: null, cancelledAt: null },
      data: { usedAt: now, acceptedByUserId: recipient.id }
    });
    if (consumed.count !== 1) throw new DomainError("TRANSFER_USED", "이미 사용되었거나 취소된 전달 QR입니다.", 409);
  }
  await tx.transferTicket.updateMany({
    where: {
      equipmentId: input.equipmentId,
      usedAt: null,
      cancelledAt: null,
      ...(input.ticketId ? { id: { not: input.ticketId } } : {})
    },
    data: { cancelledAt: now }
  });
  await tx.auditEvent.create({
    data: {
      eventType: "TRANSFER",
      equipmentId: input.equipmentId,
      actorUserId: recipient.id,
      previousUserId: active.userId,
      nextUserId: recipient.id,
      assignmentId: nextAssignment.id,
      transferTicketId: input.ticketId
    }
  });
  return { previousAssignment, nextAssignment };
}
