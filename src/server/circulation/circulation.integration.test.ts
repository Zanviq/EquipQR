import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { resetDatabase } from "@/test/reset-database";
import { checkoutEquipment } from "./checkout";
import { returnEquipment } from "./return";

async function user(employeeNumber: string, mode: "TRANSFER_QR" | "INSTANT_EQUIPMENT_QR" = "TRANSFER_QR") {
  return prisma.user.create({
    data: { employeeNumber, name: employeeNumber, passwordHash: "test", defaultTransferMode: mode }
  });
}

async function equipment(publicCode = "public-equipment") {
  return prisma.equipment.create({
    data: { assetNumber: `EQ-${publicCode}`, publicCode, name: "테스트 노트북" }
  });
}

describe("equipment circulation", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("checks out with a policy snapshot and an audit event", async () => {
    const holder = await user("EMP010", "INSTANT_EQUIPMENT_QR");
    const device = await equipment();
    const result = await checkoutEquipment({ publicCode: device.publicCode, actorUserId: holder.id });
    expect(result.assignment.transferModeSnapshot).toBe("INSTANT_EQUIPMENT_QR");
    expect(await prisma.auditEvent.findFirst({ where: { equipmentId: device.id } }))
      .toMatchObject({ eventType: "CHECKOUT", nextUserId: holder.id });
  });

  it("allows only the current holder to return", async () => {
    const holder = await user("EMP011");
    const other = await user("EMP012");
    const device = await equipment();
    await checkoutEquipment({ publicCode: device.publicCode, actorUserId: holder.id });
    await expect(returnEquipment({ publicCode: device.publicCode, actorUserId: other.id }))
      .rejects.toMatchObject({ code: "NOT_CURRENT_HOLDER" });
    await returnEquipment({ publicCode: device.publicCode, actorUserId: holder.id });
    expect(await prisma.assignment.findFirst({ where: { equipmentId: device.id, endedAt: null } })).toBeNull();
  });

  it("allows only one of two concurrent checkout attempts", async () => {
    const first = await user("EMP013");
    const second = await user("EMP014");
    const device = await equipment();
    const results = await Promise.allSettled([
      checkoutEquipment({ publicCode: device.publicCode, actorUserId: first.id }),
      checkoutEquipment({ publicCode: device.publicCode, actorUserId: second.id })
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.assignment.count({ where: { equipmentId: device.id, endedAt: null } })).toBe(1);
  });
});
