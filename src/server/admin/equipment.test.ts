import { beforeEach, describe, expect, it, vi } from "vitest";

const equipmentFindUnique = vi.fn();
const equipmentUpdate = vi.fn();
const auditCreate = vi.fn();
const transferTicketUpdateMany = vi.fn();
const requireAdmin = vi.fn();

const tx = {
  equipment: { findUnique: equipmentFindUnique, update: equipmentUpdate },
  auditEvent: { create: auditCreate },
  transferTicket: { updateMany: transferTicketUpdateMany }
};
const runTransaction = async (
  callback: (tx: unknown) => unknown,
  options?: { isolationLevel?: string }
) => {
  void options;
  return callback(tx);
};
const transaction = vi.fn(runTransaction);

vi.mock("@/server/db/client", () => ({ prisma: { $transaction: transaction } }));
vi.mock("./guard", () => ({ requireAdmin }));

describe("admin equipment audit metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockReset();
    transaction.mockImplementation(runTransaction);
    requireAdmin.mockResolvedValue({ id: "admin-1" });
  });

  it("stores the before and after name and note for detail updates", async () => {
    equipmentFindUnique.mockResolvedValue({ id: "equipment-1", name: "기존 노트북", note: "기존 비고" });
    equipmentUpdate.mockResolvedValue({ id: "equipment-1", name: "새 노트북", note: "새 비고" });
    const { updateEquipmentDetails } = await import("./equipment");

    await updateEquipmentDetails({
      adminUserId: "admin-1",
      equipmentId: "equipment-1",
      name: " 새 노트북 ",
      note: " 새 비고 "
    });

    expect(auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      eventType: "EQUIPMENT_UPDATED",
      metadata: {
        before: { name: "기존 노트북", note: "기존 비고" },
        after: { name: "새 노트북", note: "새 비고" }
      }
    }) });
  });

  it("stores the before and after operational status for status updates", async () => {
    equipmentFindUnique.mockResolvedValue({ id: "equipment-1", operationalStatus: "ACTIVE" });
    equipmentUpdate.mockResolvedValue({ id: "equipment-1", operationalStatus: "OUT_OF_SERVICE" });
    const { setEquipmentStatus } = await import("./equipment");

    await setEquipmentStatus({
      adminUserId: "admin-1",
      equipmentId: "equipment-1",
      status: "OUT_OF_SERVICE",
      reason: " 수리 "
    });

    expect(auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      eventType: "STATUS_CHANGED",
      reason: "수리",
      metadata: {
        before: { status: "ACTIVE" },
        after: { status: "OUT_OF_SERVICE" }
      }
    }) });
  });

  it("retries a serializable equipment update after a P2034 conflict", async () => {
    transaction.mockRejectedValueOnce({ code: "P2034" });
    equipmentFindUnique.mockResolvedValue({ id: "equipment-1", name: "기존", note: null });
    equipmentUpdate.mockResolvedValue({ id: "equipment-1", name: "새 이름", note: null });
    const { updateEquipmentDetails } = await import("./equipment");

    await expect(updateEquipmentDetails({
      adminUserId: "admin-1",
      equipmentId: "equipment-1",
      name: "새 이름"
    })).resolves.toMatchObject({ name: "새 이름" });

    expect(transaction).toHaveBeenCalledTimes(2);
    expect(transaction.mock.calls.every((call) => call[1]?.isolationLevel === "Serializable")).toBe(true);
  });

  it("returns a deterministic conflict after bounded P2034 retries are exhausted", async () => {
    transaction.mockRejectedValue({ code: "P2034" });
    const { updateEquipmentDetails } = await import("./equipment");

    await expect(updateEquipmentDetails({
      adminUserId: "admin-1",
      equipmentId: "equipment-1",
      name: "새 이름"
    })).rejects.toMatchObject({ code: "STATE_CONFLICT", status: 409 });

    expect(transaction).toHaveBeenCalledTimes(3);
  });
});
