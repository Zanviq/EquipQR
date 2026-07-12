import { prisma } from "@/server/db/client";
import { getEffectiveStatus } from "@/server/equipment/effective-status";

export async function getDashboard(now = new Date()) {
  const equipment = await prisma.equipment.findMany({
    where: { retiredAt: null },
    include: {
      assignments: { where: { endedAt: null }, take: 1, include: { user: { select: { name: true } } } },
      transferTickets: { where: { usedAt: null, cancelledAt: null, expiresAt: { gt: now } }, take: 1 }
    }
  });
  const statuses = equipment.map((item) => getEffectiveStatus({
    operationalStatus: item.operationalStatus,
    hasActiveAssignment: item.assignments.length > 0,
    hasValidTicket: item.transferTickets.length > 0
  }));
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [recentEvents, longLoans, userHoldings] = await Promise.all([
    prisma.auditEvent.findMany({
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: 12,
      include: { equipment: true, actorUser: { select: { name: true } }, previousUser: { select: { name: true } }, nextUser: { select: { name: true } } }
    }),
    prisma.assignment.findMany({
      where: { endedAt: null, startedAt: { lte: cutoff } },
      orderBy: { startedAt: "asc" },
      include: { equipment: true, user: { select: { name: true } } }
    }),
    prisma.user.findMany({
      where: { assignments: { some: { endedAt: null } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, employeeNumber: true, status: true, _count: { select: { assignments: { where: { endedAt: null } } } } }
    })
  ]);
  return {
    counts: {
      total: equipment.length,
      available: statuses.filter((status) => status === "AVAILABLE").length,
      checkedOut: statuses.filter((status) => status === "CHECKED_OUT" || status === "TRANSFER_PENDING").length,
      outOfService: statuses.filter((status) => status === "OUT_OF_SERVICE").length
    },
    recentEvents,
    longLoans,
    userHoldings: userHoldings.sort((a, b) => b._count.assignments - a._count.assignments).slice(0, 10)
  };
}
