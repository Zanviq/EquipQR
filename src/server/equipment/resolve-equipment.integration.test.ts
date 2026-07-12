import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { resetDatabase } from "@/test/reset-database";
import { resolveEquipment } from "./resolve-equipment";

describe("resolveEquipment", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("returns checkout for an available device", async () => {
    const actor = await prisma.user.create({ data: { employeeNumber: "EMP020", name: "직원", passwordHash: "test" } });
    const device = await prisma.equipment.create({ data: { assetNumber: "EQ-020", publicCode: "code-020", name: "노트북" } });
    expect(await resolveEquipment(device.publicCode, actor.id)).toMatchObject({
      status: "AVAILABLE",
      allowedActions: ["CHECKOUT"]
    });
  });

  it("reveals only a holder name and permits instant transfer when snapshotted", async () => {
    const holder = await prisma.user.create({ data: { employeeNumber: "EMP021", name: "현재 사용자", passwordHash: "test" } });
    const actor = await prisma.user.create({ data: { employeeNumber: "EMP022", name: "다음 사용자", passwordHash: "test" } });
    const device = await prisma.equipment.create({ data: { assetNumber: "EQ-021", publicCode: "code-021", name: "태블릿" } });
    await prisma.assignment.create({ data: { equipmentId: device.id, userId: holder.id, transferModeSnapshot: "INSTANT_EQUIPMENT_QR", acquisitionType: "CHECKOUT" } });
    const result = await resolveEquipment(device.publicCode, actor.id);
    expect(result.holder).toEqual({ name: "현재 사용자" });
    expect(JSON.stringify(result)).not.toContain("EMP021");
    expect(result.allowedActions).toEqual(["INSTANT_TRANSFER"]);
  });
});
