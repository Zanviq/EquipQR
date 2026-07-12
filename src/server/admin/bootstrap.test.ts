import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { bootstrapAdmin } from "./bootstrap";

describe("bootstrapAdmin", () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });
  afterAll(() => prisma.$disconnect());

  it("creates one administrator and refuses a second bootstrap", async () => {
    const password = ["Initial", "admin", "password", "42!"].join(" ");
    const first = await bootstrapAdmin({ employeeNumber: "admin001", name: "관리자", password });
    expect(first).toMatchObject({ employeeNumber: "ADMIN001", role: "ADMIN" });
    await expect(bootstrapAdmin({ employeeNumber: "ADMIN002", name: "관리자2", password }))
      .rejects.toThrow("INITIAL_ADMIN_ALREADY_EXISTS");
  });

  it("requires a password of at least twelve characters", async () => {
    await expect(bootstrapAdmin({ employeeNumber: "ADMIN001", name: "관리자", password: "short" }))
      .rejects.toThrow("WEAK_PASSWORD");
  });
});
