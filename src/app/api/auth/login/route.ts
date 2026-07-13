import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { normalizeEmployeeNumber } from "@/server/auth/employee-number";
import { verifyPassword } from "@/server/auth/password";
import { createAuthenticatedSession, SESSION_COOKIE } from "@/server/auth/session";
import {
  clearLoginRateLimit,
  requestIp,
  reserveLoginRateLimitAttempt
} from "@/server/http/rate-limit";
import { domainErrorResponse } from "@/server/http/response";

const inputSchema = z.object({
  employeeNumber: z.string().min(1).max(64),
  password: z.string().min(1).max(256)
});

const invalid = () => NextResponse.json(
  { code: "INVALID_CREDENTIALS", message: "사번 또는 비밀번호를 확인해 주세요." },
  { status: 401 }
);

export async function POST(request: Request) {
  try {
  const ip = requestIp(request);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalid();

  let employeeNumber: string;
  try {
    employeeNumber = normalizeEmployeeNumber(parsed.data.employeeNumber);
  } catch {
    return invalid();
  }

  const ipRateLimitKey = `login:ip:${ip}`;
  const accountRateLimitKey = `login:${employeeNumber}:${ip}`;
  reserveLoginRateLimitAttempt({ key: ipRateLimitKey, limit: 200, windowMs: 15 * 60 * 1000 });
  reserveLoginRateLimitAttempt({ key: accountRateLimitKey, limit: 10, windowMs: 15 * 60 * 1000 });
  const user = await prisma.user.findUnique({ where: { employeeNumber } });
  if (!user || user.status !== "ACTIVE" || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
    return invalid();
  }

  const session = await createAuthenticatedSession({
    userId: user.id,
    passwordChangedAt: user.passwordChangedAt,
    createdIp: ip
  });
  if (!session) {
    return invalid();
  }
  clearLoginRateLimit(ipRateLimitKey);
  clearLoginRateLimit(accountRateLimitKey);
  const response = NextResponse.json({ user: { name: user.name, role: user.role } });
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.SESSION_COOKIE_SECURE !== "false",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt
  });
  return response;
  } catch (error) { return domainErrorResponse(error); }
}
