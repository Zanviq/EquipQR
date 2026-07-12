import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { resetDatabase } from "@/test/reset-database";
import { createSession, getSessionUser, revokeSession } from "./session";

describe("server sessions", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(() => prisma.$disconnect());

  it("stores only a token digest and resolves an active user", async () => {
    const user = await prisma.user.create({
      data: { employeeNumber: "EMP001", name: "김직원", passwordHash: "test-hash" }
    });
    const issued = await createSession(user.id, "127.0.0.1");
    expect(issued.token).toHaveLength(64);
    expect(await prisma.session.findFirst({ where: { tokenHash: issued.token } })).toBeNull();
    expect((await getSessionUser(issued.token))?.id).toBe(user.id);
  });

  it("rejects revoked sessions and inactive users", async () => {
    const user = await prisma.user.create({
      data: { employeeNumber: "EMP002", name: "이직원", passwordHash: "test-hash" }
    });
    const issued = await createSession(user.id);
    await revokeSession(issued.token);
    expect(await getSessionUser(issued.token)).toBeNull();

    const next = await createSession(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { status: "INACTIVE" } });
    expect(await getSessionUser(next.token)).toBeNull();
  });
});
