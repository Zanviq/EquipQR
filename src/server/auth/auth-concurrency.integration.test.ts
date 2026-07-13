import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/client";
import { resetDatabase } from "@/test/reset-database";
import { createAuthenticatedSession } from "./session";

async function holdUserMutation(
  operation: (tx: Prisma.TransactionClient) => Promise<void>
) {
  let markChanged!: () => void;
  let release!: () => void;
  const changed = new Promise<void>((resolve) => { markChanged = resolve; });
  const released = new Promise<void>((resolve) => { release = resolve; });
  const done = prisma.$transaction(async (tx) => {
    await operation(tx);
    markChanged();
    await released;
  });
  await changed;
  return { release, done };
}

async function waitForBlockedCredentialCheck() {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    const [result] = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
        AND wait_event_type = 'Lock'
        AND query ILIKE '%password_changed_at%'
        AND query ILIKE '%FOR UPDATE%'
    `;
    if (Number(result.count) >= 1) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("credential recheck did not reach the user row lock");
}

async function employee(employeeNumber: string) {
  return prisma.user.create({
    data: { employeeNumber, name: "직원", passwordHash: "previous-password-hash" }
  });
}

describe("authentication concurrency", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("does not create a session from a credential snapshot made stale by password reset", async () => {
    const user = await employee("EMP-CREDENTIAL-RACE");
    const changedAt = new Date(user.passwordChangedAt.getTime() + 1_000);
    const mutation = await holdUserMutation(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: "replacement-password-hash", passwordChangedAt: changedAt }
      });
      await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    });
    let login!: ReturnType<typeof createAuthenticatedSession>;

    try {
      login = createAuthenticatedSession({
        userId: user.id,
        passwordChangedAt: user.passwordChangedAt,
        createdIp: "203.0.113.10"
      });
      await waitForBlockedCredentialCheck();
    } finally {
      mutation.release();
    }
    await mutation.done;

    await expect(login).resolves.toBeNull();
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it("does not create a session while the account is being deactivated", async () => {
    const user = await employee("EMP-DEACTIVATE-RACE");
    const mutation = await holdUserMutation(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { status: "INACTIVE" } });
      await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    });
    let login!: ReturnType<typeof createAuthenticatedSession>;

    try {
      login = createAuthenticatedSession({
        userId: user.id,
        passwordChangedAt: user.passwordChangedAt,
        createdIp: "203.0.113.10"
      });
      await waitForBlockedCredentialCheck();
    } finally {
      mutation.release();
    }
    await mutation.done;

    await expect(login).resolves.toBeNull();
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  });
});
