import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { createSession, SESSION_COOKIE } from "./session";
import { getRequestUser, requireRequestUser } from "./current-user";

describe("request authentication", () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });
  afterAll(() => prisma.$disconnect());

  it("resolves a session cookie and enforces roles", async () => {
    const user = await prisma.user.create({
      data: { employeeNumber: "ADMIN001", name: "관리자", passwordHash: "test", role: "ADMIN" }
    });
    const session = await createSession(user.id);
    const request = new Request("http://localhost/api", {
      headers: { cookie: `${SESSION_COOKIE}=${session.token}` }
    });
    expect((await getRequestUser(request))?.id).toBe(user.id);
    expect((await requireRequestUser(request, "ADMIN")).role).toBe("ADMIN");
  });

  it("rejects an employee from an admin boundary", async () => {
    const user = await prisma.user.create({
      data: { employeeNumber: "EMP003", name: "직원", passwordHash: "test" }
    });
    const session = await createSession(user.id);
    const request = new Request("http://localhost/api", {
      headers: { cookie: `${SESSION_COOKIE}=${session.token}` }
    });
    await expect(requireRequestUser(request, "ADMIN")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
