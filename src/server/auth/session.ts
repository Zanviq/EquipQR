import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/server/db/client";
import { SESSION_COOKIE } from "./constants";

export { SESSION_COOKIE };
export const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, createdIp?: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.session.create({
    data: { userId, tokenHash: digest(token), expiresAt, createdIp }
  });
  return { token, expiresAt };
}

export async function getSessionUser(token: string) {
  const session = await prisma.session.findUnique({
    where: { tokenHash: digest(token) },
    include: { user: true }
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  if (session.user.status !== "ACTIVE") return null;
  return session.user;
}

export async function revokeSession(token: string) {
  await prisma.session.updateMany({
    where: { tokenHash: digest(token), revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

export async function revokeAllUserSessions(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}
