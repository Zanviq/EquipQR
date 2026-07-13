import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { resetDatabase } from "@/test/reset-database";
import { setUserStatus } from "./users";

async function lockUserRows(userIds: string[]) {
  let markLocked!: () => void;
  let release!: () => void;
  const locked = new Promise<void>((resolve) => { markLocked = resolve; });
  const released = new Promise<void>((resolve) => { release = resolve; });
  const done = prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ANY(${userIds}::uuid[]) FOR UPDATE`;
    markLocked();
    await released;
  });
  await locked;
  return { release, done };
}

async function waitForBlockedUserUpdates(expected: number) {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    const [result] = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
        AND wait_event_type = 'Lock'
        AND query ILIKE '%UPDATE%users%'
    `;
    if (Number(result.count) >= expected) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`${expected} concurrent user updates did not reach the row lock`);
}

async function admin(employeeNumber: string) {
  return prisma.user.create({
    data: { employeeNumber, name: employeeNumber, passwordHash: "test", role: "ADMIN" }
  });
}

describe("administrator status concurrency", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("never allows two administrators to deactivate each other down to zero active administrators", async () => {
    const first = await admin("ADMIN-FIRST");
    const second = await admin("ADMIN-SECOND");
    const lock = await lockUserRows([first.id, second.id]);
    const updates = [
      setUserStatus({ adminUserId: first.id, userId: second.id, status: "INACTIVE" }),
      setUserStatus({ adminUserId: second.id, userId: first.id, status: "INACTIVE" })
    ];

    try {
      await waitForBlockedUserUpdates(2);
    } finally {
      lock.release();
    }
    await lock.done;
    const results = await Promise.allSettled(updates);

    expect(await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } })).toBe(1);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  });
});
