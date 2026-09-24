import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { verifyPassword } from "@/server/auth/password";
import { resetDatabase } from "@/test/reset-database";
import { DEMO_ACCOUNT, DEMO_EQUIPMENT, seedDemo } from "./seed";

describe("seedDemo", () => {
  beforeEach(async () => {
    await resetDatabase();
  });
  afterAll(() => prisma.$disconnect());

  it("creates the demo administrator and demo equipment", async () => {
    await seedDemo();
    const user = await prisma.user.findUniqueOrThrow({ where: { employeeNumber: "DEMO" } });
    expect(user).toMatchObject({ role: "ADMIN", status: "ACTIVE" });
    expect(await verifyPassword(user.passwordHash, DEMO_ACCOUNT.password)).toBe(true);
    expect(await prisma.equipment.count()).toBe(DEMO_EQUIPMENT.length);
    expect(await prisma.auditEvent.count({ where: { eventType: "EQUIPMENT_CREATED", actorUserId: user.id } }))
      .toBe(DEMO_EQUIPMENT.length);
  });

  it("is idempotent and keeps existing public codes", async () => {
    await seedDemo();
    const before = await prisma.equipment.findMany({ orderBy: { assetNumber: "asc" }, select: { assetNumber: true, publicCode: true } });
    const result = await seedDemo();
    const after = await prisma.equipment.findMany({ orderBy: { assetNumber: "asc" }, select: { assetNumber: true, publicCode: true } });
    expect(result).toEqual({ userCreated: false, equipmentCreated: 0 });
    expect(after).toEqual(before);
    expect(await prisma.user.count()).toBe(1);
  });
});
