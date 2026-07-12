import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { resetDatabase } from "@/test/reset-database";
import { acceptTransferTicket } from "./accept-ticket";
import { instantTransfer } from "./instant-transfer";
import { issueTransferTicket } from "./issue-ticket";
import { cancelTransferTicket } from "./cancel-ticket";

async function fixture(mode: "TRANSFER_QR" | "INSTANT_EQUIPMENT_QR") {
  const sender = await prisma.user.create({ data: { employeeNumber: "EMP030", name: "보내는 직원", passwordHash: "test" } });
  const recipient = await prisma.user.create({
    data: { employeeNumber: "EMP031", name: "받는 직원", passwordHash: "test", defaultTransferMode: "INSTANT_EQUIPMENT_QR" }
  });
  const device = await prisma.equipment.create({ data: { assetNumber: "EQ-030", publicCode: "code-030", name: "카메라" } });
  const assignment = await prisma.assignment.create({
    data: { equipmentId: device.id, userId: sender.id, transferModeSnapshot: mode, acquisitionType: "CHECKOUT" }
  });
  return { sender, recipient, device, assignment };
}

describe("equipment transfer", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("issues a hashed ten-minute ticket and consumes it once", async () => {
    const data = await fixture("TRANSFER_QR");
    const now = new Date("2026-07-12T10:00:00.000Z");
    const issued = await issueTransferTicket({ equipmentId: data.device.id, actorUserId: data.sender.id, now });
    expect(issued.expiresAt.toISOString()).toBe("2026-07-12T10:10:00.000Z");
    expect(await prisma.transferTicket.findFirst({ where: { tokenHash: issued.token } })).toBeNull();

    const result = await acceptTransferTicket({ token: issued.token, recipientUserId: data.recipient.id, now: new Date("2026-07-12T10:09:59.000Z") });
    expect(result.nextAssignment.userId).toBe(data.recipient.id);
    expect(result.nextAssignment.transferModeSnapshot).toBe("INSTANT_EQUIPMENT_QR");
    await expect(acceptTransferTicket({ token: issued.token, recipientUserId: data.sender.id, now }))
      .rejects.toMatchObject({ code: "TRANSFER_USED" });
  });

  it("rejects an expired ticket", async () => {
    const data = await fixture("TRANSFER_QR");
    const issued = await issueTransferTicket({ equipmentId: data.device.id, actorUserId: data.sender.id, now: new Date("2026-07-12T10:00:00.000Z") });
    await expect(acceptTransferTicket({ token: issued.token, recipientUserId: data.recipient.id, now: new Date("2026-07-12T10:10:00.000Z") }))
      .rejects.toMatchObject({ code: "TRANSFER_EXPIRED" });
  });

  it("lets the current holder cancel without deleting the ticket", async () => {
    const data = await fixture("TRANSFER_QR");
    const issued = await issueTransferTicket({ equipmentId: data.device.id, actorUserId: data.sender.id });
    await cancelTransferTicket({ ticketId: issued.ticketId, actorUserId: data.sender.id });
    const stored = await prisma.transferTicket.findUnique({ where: { id: issued.ticketId } });
    expect(stored?.cancelledAt).not.toBeNull();
    await expect(acceptTransferTicket({ token: issued.token, recipientUserId: data.recipient.id }))
      .rejects.toMatchObject({ code: "TRANSFER_USED" });
  });

  it("allows instant transfer only for a snapshotted instant policy", async () => {
    const restricted = await fixture("TRANSFER_QR");
    await expect(instantTransfer({ publicCode: restricted.device.publicCode, recipientUserId: restricted.recipient.id }))
      .rejects.toMatchObject({ code: "TRANSFER_QR_REQUIRED" });

    await resetDatabase();
    const allowed = await fixture("INSTANT_EQUIPMENT_QR");
    const result = await instantTransfer({ publicCode: allowed.device.publicCode, recipientUserId: allowed.recipient.id });
    expect(result.nextAssignment).toMatchObject({ userId: allowed.recipient.id, acquisitionType: "INSTANT_QR" });
  });
});
