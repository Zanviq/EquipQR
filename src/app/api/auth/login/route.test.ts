import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { resetDatabase } from "@/test/reset-database";
import { hashPassword } from "@/server/auth/password";
import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await resetDatabase();
  });
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
        passwordHash: await hashPassword(password)
      }
    });
    const response = await POST(request({ employeeNumber: "emp001", password }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("equipqr_session=");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
  });
});
