import { prisma } from "@/server/db/client";
import { DomainError } from "@/server/domain/errors";
import { getEffectiveStatus } from "./effective-status";

export type AllowedEquipmentAction = "CHECKOUT" | "RETURN" | "CREATE_TRANSFER_TICKET" | "INSTANT_TRANSFER";

export async function resolveEquipment(publicCode: string, actorUserId: string, now = new Date()) {
  const equipment = await prisma.equipment.findUnique({
    where: { publicCode },
    include: {
      assignments: {
        where: { endedAt: null },
        take: 1,
        include: { user: { select: { id: true, name: true } } }
      },
      transferTickets: {
        where: { usedAt: null, cancelledAt: null, expiresAt: { gt: now } },
        take: 1
      }
    }
  });
  if (!equipment || equipment.retiredAt) throw new DomainError("EQUIPMENT_NOT_FOUND", "장비를 찾을 수 없습니다.", 404);
  const active = equipment.assignments[0];
  const status = getEffectiveStatus({
    operationalStatus: equipment.operationalStatus,
    hasActiveAssignment: Boolean(active),
    hasValidTicket: equipment.transferTickets.length > 0
  });
  const allowedActions: AllowedEquipmentAction[] = [];
  if (status !== "OUT_OF_SERVICE") {
    if (!active) allowedActions.push("CHECKOUT");
    else if (active.userId === actorUserId) {
      allowedActions.push("RETURN");
      if (active.transferModeSnapshot === "TRANSFER_QR") allowedActions.push("CREATE_TRANSFER_TICKET");
    } else if (active.transferModeSnapshot === "INSTANT_EQUIPMENT_QR") {
      allowedActions.push("INSTANT_TRANSFER");
    }
  }
  return {
    equipment: { name: equipment.name, assetNumber: equipment.assetNumber, publicCode: equipment.publicCode },
    status,
    holder: active ? { name: active.user.name } : null,
    transferMode: active?.transferModeSnapshot ?? null,
    allowedActions
  };
}
