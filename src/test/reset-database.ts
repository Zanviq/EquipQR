import { prisma } from "@/server/db/client";

export async function resetDatabase() {
  await prisma.auditEvent.deleteMany();
  await prisma.transferTicket.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.user.deleteMany();
}
