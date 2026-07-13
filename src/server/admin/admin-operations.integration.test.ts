import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { createSession } from "@/server/auth/session";
import { resetDatabase } from "@/test/reset-database";
import { changeResponsibility, createEquipment, setEquipmentStatus, updateEquipmentDetails } from "./equipment";
import { getDashboard } from "./dashboard";
import { setUserStatus } from "./users";

async function admin() {
  return prisma.user.create({ data: { employeeNumber: "ADMIN100", name: "관리자", passwordHash: "test", role: "ADMIN" } });
}

async function lockEquipmentRow(equipmentId: string) {
  let markLocked!: () => void;
  let release!: () => void;
  const locked = new Promise<void>((resolve) => { markLocked = resolve; });
  const released = new Promise<void>((resolve) => { release = resolve; });
  const done = prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM equipment WHERE id = ${equipmentId}::uuid FOR UPDATE`;
    markLocked();
    await released;
  });
  await locked;
  return { release, done };
}

async function waitForBlockedEquipmentUpdates(expected: number) {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    const [result] = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
        AND wait_event_type = 'Lock'
        AND query ILIKE '%UPDATE%equipment%'
    `;
    if (Number(result.count) >= expected) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`${expected} concurrent equipment updates did not reach the row lock`);
}

function auditChange<T>(metadata: unknown) {
  return metadata as { before: T; after: T };
}

describe("administrator operations", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("revokes sessions but keeps assignments when a user is deactivated", async () => {
    const actor = await admin();
    const employee = await prisma.user.create({ data: { employeeNumber: "EMP100", name: "직원", passwordHash: "test" } });
    const device = await prisma.equipment.create({ data: { assetNumber: "EQ-100", publicCode: "code-100", name: "노트북" } });
    await prisma.assignment.create({ data: { equipmentId: device.id, userId: employee.id, transferModeSnapshot: "TRANSFER_QR", acquisitionType: "CHECKOUT" } });
    await createSession(employee.id);
    await setUserStatus({ adminUserId: actor.id, userId: employee.id, status: "INACTIVE" });
    expect(await prisma.session.count({ where: { userId: employee.id, revokedAt: null } })).toBe(0);
    expect(await prisma.assignment.count({ where: { userId: employee.id, endedAt: null } })).toBe(1);
  });

  it("registers equipment and audits a forced reassignment with a reason", async () => {
    const actor = await admin();
    const previous = await prisma.user.create({ data: { employeeNumber: "EMP101", name: "이전", passwordHash: "test" } });
    const next = await prisma.user.create({ data: { employeeNumber: "EMP102", name: "다음", passwordHash: "test" } });
    const device = await createEquipment({ adminUserId: actor.id, assetNumber: "eq-101", name: "카메라" });
    await prisma.assignment.create({ data: { equipmentId: device.id, userId: previous.id, transferModeSnapshot: "TRANSFER_QR", acquisitionType: "CHECKOUT" } });
    await changeResponsibility({ adminUserId: actor.id, equipmentId: device.id, nextUserId: next.id, reason: "팀 이동" });
    expect(await prisma.assignment.findFirst({ where: { equipmentId: device.id, endedAt: null } })).toMatchObject({ userId: next.id, acquisitionType: "ADMIN" });
    expect(await prisma.auditEvent.findFirst({ where: { equipmentId: device.id, eventType: "ADMIN_REASSIGN" } }))
      .toMatchObject({ actorUserId: actor.id, reason: "팀 이동", previousUserId: previous.id, nextUserId: next.id });
  });

  it("records the before and after name and note when equipment details change", async () => {
    const actor = await admin();
    const device = await prisma.equipment.create({
      data: { assetNumber: "EQ-DETAILS", publicCode: "code-details", name: "기존 노트북", note: "기존 비고" }
    });

    await updateEquipmentDetails({
      adminUserId: actor.id,
      equipmentId: device.id,
      name: "새 노트북",
      note: "새 비고"
    });

    const audit = await prisma.auditEvent.findFirstOrThrow({
      where: { equipmentId: device.id, eventType: "EQUIPMENT_UPDATED" }
    });
    expect(audit.metadata).toEqual({
      before: { name: "기존 노트북", note: "기존 비고" },
      after: { name: "새 노트북", note: "새 비고" }
    });
  });

  it("records the before and after operational status when equipment status changes", async () => {
    const actor = await admin();
    const device = await prisma.equipment.create({
      data: { assetNumber: "EQ-STATUS", publicCode: "code-status", name: "회의실 태블릿" }
    });

    await setEquipmentStatus({
      adminUserId: actor.id,
      equipmentId: device.id,
      status: "OUT_OF_SERVICE",
      reason: "수리"
    });

    const audit = await prisma.auditEvent.findFirstOrThrow({
      where: { equipmentId: device.id, eventType: "STATUS_CHANGED" }
    });
    expect(audit.metadata).toEqual({
      before: { status: "ACTIVE" },
      after: { status: "OUT_OF_SERVICE" }
    });
  });

  it("serializes concurrent equipment detail audits into one before/after chain", async () => {
    const actor = await admin();
    const device = await prisma.equipment.create({
      data: { assetNumber: "EQ-CONCURRENT-DETAILS", publicCode: "code-concurrent-details", name: "처음", note: null }
    });
    const lock = await lockEquipmentRow(device.id);
    const updates = [
      updateEquipmentDetails({ adminUserId: actor.id, equipmentId: device.id, name: "첫 번째", note: "A" }),
      updateEquipmentDetails({ adminUserId: actor.id, equipmentId: device.id, name: "두 번째", note: "B" })
    ];

    try {
      await waitForBlockedEquipmentUpdates(2);
    } finally {
      lock.release();
    }
    await lock.done;
    await Promise.all(updates);

    const events = await prisma.auditEvent.findMany({
      where: { equipmentId: device.id, eventType: "EQUIPMENT_UPDATED" },
      orderBy: [{ occurredAt: "asc" }, { id: "asc" }]
    });
    const changes = events.map((event) => auditChange<{ name: string; note: string | null }>(event.metadata));
    const current = await prisma.equipment.findUniqueOrThrow({ where: { id: device.id } });

    expect(events).toHaveLength(2);
    expect(changes[0].before).toEqual({ name: "처음", note: null });
    expect(changes[1].before).toEqual(changes[0].after);
    expect({ name: current.name, note: current.note }).toEqual(changes[1].after);
  });

  it("serializes concurrent equipment status audits into one before/after chain", async () => {
    const actor = await admin();
    const device = await prisma.equipment.create({
      data: { assetNumber: "EQ-CONCURRENT-STATUS", publicCode: "code-concurrent-status", name: "태블릿" }
    });
    const lock = await lockEquipmentRow(device.id);
    const updates = [
      setEquipmentStatus({ adminUserId: actor.id, equipmentId: device.id, status: "OUT_OF_SERVICE", reason: "수리 A" }),
      setEquipmentStatus({ adminUserId: actor.id, equipmentId: device.id, status: "OUT_OF_SERVICE", reason: "수리 B" })
    ];

    try {
      await waitForBlockedEquipmentUpdates(2);
    } finally {
      lock.release();
    }
    await lock.done;
    await Promise.all(updates);

    const events = await prisma.auditEvent.findMany({
      where: { equipmentId: device.id, eventType: "STATUS_CHANGED" },
      orderBy: [{ occurredAt: "asc" }, { id: "asc" }]
    });
    const changes = events.map((event) => auditChange<{ status: string }>(event.metadata));

    expect(events).toHaveLength(2);
    expect(changes[0].before).toEqual({ status: "ACTIVE" });
    expect(changes[1].before).toEqual(changes[0].after);
    expect(changes[1].after).toEqual({ status: "OUT_OF_SERVICE" });
  });

  it("counts transfer pending equipment as checked out", async () => {
    const actor = await admin();
    const employee = await prisma.user.create({ data: { employeeNumber: "EMP103", name: "직원", passwordHash: "test" } });
    const device = await prisma.equipment.create({ data: { assetNumber: "EQ-103", publicCode: "code-103", name: "태블릿" } });
    const assignment = await prisma.assignment.create({ data: { equipmentId: device.id, userId: employee.id, transferModeSnapshot: "TRANSFER_QR", acquisitionType: "CHECKOUT" } });
    await prisma.transferTicket.create({ data: { equipmentId: device.id, fromAssignmentId: assignment.id, createdByUserId: employee.id, tokenHash: "digest", expiresAt: new Date(Date.now() + 60_000) } });
    const dashboard = await getDashboard(new Date());
    expect(dashboard.counts).toMatchObject({ total: 1, checkedOut: 1, available: 0 });
    expect(actor.role).toBe("ADMIN");
  });
});
