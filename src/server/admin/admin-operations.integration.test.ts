import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { createSession } from "@/server/auth/session";
import { resetDatabase } from "@/test/reset-database";
import { changeResponsibility, createEquipment } from "./equipment";
import { getDashboard } from "./dashboard";
import { setUserStatus } from "./users";

async function admin() {
  return prisma.user.create({ data: { employeeNumber: "ADMIN100", name: "관리자", passwordHash: "test", role: "ADMIN" } });
}

describe("administrator operations", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("revokes sessions but keeps assignments when a user is deactivated", async () => {
    const actor = await admin();
    const employee = await prisma.user.create({ data: { employeeNumber: "EMP100", name: "직원", passwordHash: "test" } });
    const device = await prisma.equipment.create({ data: { assetNumber: "EQ-100", publicCode: "code-100", name: "노트북" } });
    await prisma.assignment.create({ data: { equipmentId: device.id, userId: employee.id, transferModeSnapshot: "TRANSFER_QR", acquisitionType: "CHECKOUT" } });
    await createSession(employee.id);
    await setUserStatus({ adminUserId: actor.id, userId: employee.id, status: "INACTIVE" });
    expect(await prisma.session.count({ where: { userId: employee.id, revokedAt: null } })).toBe(0);
    expect(await prisma.assignment.count({ where: { userId: employee.id, endedAt: null } })).toBe(1);
  });

  it("registers equipment and audits a forced reassignment with a reason", async () => {
    const actor = await admin();
    const previous = await prisma.user.create({ data: { employeeNumber: "EMP101", name: "이전", passwordHash: "test" } });
    const next = await prisma.user.create({ data: { employeeNumber: "EMP102", name: "다음", passwordHash: "test" } });
    const device = await createEquipment({ adminUserId: actor.id, assetNumber: "eq-101", name: "카메라" });
    await prisma.assignment.create({ data: { equipmentId: device.id, userId: previous.id, transferModeSnapshot: "TRANSFER_QR", acquisitionType: "CHECKOUT" } });
    await changeResponsibility({ adminUserId: actor.id, equipmentId: device.id, nextUserId: next.id, reason: "팀 이동" });
    expect(await prisma.assignment.findFirst({ where: { equipmentId: device.id, endedAt: null } })).toMatchObject({ userId: next.id, acquisitionType: "ADMIN" });
    expect(await prisma.auditEvent.findFirst({ where: { equipmentId: device.id, eventType: "ADMIN_REASSIGN" } }))
      .toMatchObject({ actorUserId: actor.id, reason: "팀 이동", previousUserId: previous.id, nextUserId: next.id });
  });

  it("counts transfer pending equipment as checked out", async () => {
    const actor = await admin();
    const employee = await prisma.user.create({ data: { employeeNumber: "EMP103", name: "직원", passwordHash: "test" } });
    const device = await prisma.equipment.create({ data: { assetNumber: "EQ-103", publicCode: "code-103", name: "태블릿" } });
    const assignment = await prisma.assignment.create({ data: { equipmentId: device.id, userId: employee.id, transferModeSnapshot: "TRANSFER_QR", acquisitionType: "CHECKOUT" } });
    await prisma.transferTicket.create({ data: { equipmentId: device.id, fromAssignmentId: assignment.id, createdByUserId: employee.id, tokenHash: "digest", expiresAt: new Date(Date.now() + 60_000) } });
    const dashboard = await getDashboard(new Date());
    expect(dashboard.counts).toMatchObject({ total: 1, checkedOut: 1, available: 0 });
    expect(actor.role).toBe("ADMIN");
  });
});
