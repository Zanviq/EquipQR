import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/client";
import { resetDatabase } from "@/test/reset-database";
import * as passwordService from "@/server/auth/password";
import { resetRateLimitsForTest } from "@/server/http/rate-limit";
import { POST } from "./route";

function request(body: unknown, ip = "203.0.113.10") {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify(body)
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await resetDatabase();
    resetRateLimitsForTest();
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(() => prisma.$disconnect());

  it("returns one generic error for invalid credentials", async () => {
    const response = await POST(request({ employeeNumber: "UNKNOWN", password: "wrong" }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      code: "INVALID_CREDENTIALS",
      message: "사번 또는 비밀번호를 확인해 주세요."
    });
  });

  it("sets a protected cookie for a valid active employee", async () => {
    const password = ["Valid", "employee", "password", "42!"].join(" ");
    await prisma.user.create({
      data: {
        employeeNumber: "EMP001",
        name: "김직원",
        passwordHash: await passwordService.hashPassword(password)
      }
    });
    const response = await POST(request({ employeeNumber: "emp001", password }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("equipqr_session=");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
  });

  it("does not block a different employee who succeeds from the same NAT", async () => {
    const password = ["Valid", "employee", "password", "42!"].join(" ");
    const passwordHash = await passwordService.hashPassword(password);
    await prisma.user.createMany({ data: [
      { employeeNumber: "EMP001", name: "김직원", passwordHash },
      { employeeNumber: "EMP002", name: "이직원", passwordHash }
    ] });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await POST(request({ employeeNumber: "emp001", password: "wrong" }))).status).toBe(401);
    }

    expect((await POST(request({ employeeNumber: "emp002", password }))).status).toBe(200);
  });

  it("clears normalized employee and IP failures after a successful login", async () => {
    const password = ["Valid", "employee", "password", "42!"].join(" ");
    await prisma.user.create({
      data: { employeeNumber: "EMP001", name: "김직원", passwordHash: await passwordService.hashPassword(password) }
    });

    for (let attempt = 0; attempt < 9; attempt += 1) {
      expect((await POST(request({ employeeNumber: " emp001 ", password: "wrong" }))).status).toBe(401);
    }

    expect((await POST(request({ employeeNumber: "EMP001", password }))).status).toBe(200);
    expect((await POST(request({ employeeNumber: "emp001", password: "wrong" }))).status).toBe(401);
  });

  it("does not count malformed employee numbers against a valid employee", async () => {
    const password = ["Valid", "employee", "password", "42!"].join(" ");
    await prisma.user.create({
      data: { employeeNumber: "EMP001", name: "김직원", passwordHash: await passwordService.hashPassword(password) }
    });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await POST(request({ employeeNumber: "not an employee number", password: "wrong" }))).status).toBe(401);
    }

    expect((await POST(request({ employeeNumber: "EMP001", password }))).status).toBe(200);
  });

  it("blocks the eleventh failure before running password verification", async () => {
    const password = ["Valid", "employee", "password", "42!"].join(" ");
    await prisma.user.create({
      data: { employeeNumber: "EMP001", name: "김직원", passwordHash: await passwordService.hashPassword(password) }
    });
    const verifyPassword = vi.spyOn(passwordService, "verifyPassword");

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await POST(request({ employeeNumber: "EMP001", password: "wrong" }))).status).toBe(401);
    }
    expect(verifyPassword).toHaveBeenCalledTimes(10);

    expect((await POST(request({ employeeNumber: "EMP001", password: "wrong" }))).status).toBe(429);
    expect(verifyPassword).toHaveBeenCalledTimes(10);
  });

  it("does not let a valid password bypass an exhausted failure window", async () => {
    const password = ["Valid", "employee", "password", "42!"].join(" ");
    const user = await prisma.user.create({
      data: { employeeNumber: "EMP001", name: "김직원", passwordHash: await passwordService.hashPassword(password) }
    });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await POST(request({ employeeNumber: "EMP001", password: "wrong" }))).status).toBe(401);
    }

    expect((await POST(request({ employeeNumber: "EMP001", password }))).status).toBe(429);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it("keeps the same exhausted key when a candidate changes from nonexistent to existing", async () => {
    const password = ["Valid", "employee", "password", "42!"].join(" ");
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await POST(request({ employeeNumber: "CANDIDATE", password: "wrong" }))).status).toBe(401);
    }
    expect((await POST(request({ employeeNumber: "CANDIDATE", password: "wrong" }))).status).toBe(429);

    await prisma.user.create({
      data: { employeeNumber: "CANDIDATE", name: "후보", passwordHash: await passwordService.hashPassword(password) }
    });

    expect((await POST(request({ employeeNumber: "CANDIDATE", password }))).status).toBe(429);
  });

  it("admits at most ten parallel password checks and sessions", async () => {
    const password = ["Valid", "employee", "password", "42!"].join(" ");
    const user = await prisma.user.create({
      data: { employeeNumber: "EMP-PARALLEL", name: "병렬", passwordHash: await passwordService.hashPassword(password) }
    });
    const verifyPassword = vi.spyOn(passwordService, "verifyPassword");

    const responses = await Promise.all(Array.from({ length: 11 }, () => (
      POST(request({ employeeNumber: "EMP-PARALLEL", password }))
    )));
    const statuses = responses.map((response) => response.status);

    expect(statuses.filter((status) => status === 200)).toHaveLength(10);
    expect(statuses.filter((status) => status === 429)).toHaveLength(1);
    expect(verifyPassword).toHaveBeenCalledTimes(10);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(10);
  });
});
