import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  assignmentFindMany: vi.fn(),
  observationFindMany: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/db/client", () => ({
  prisma: {
    assignment: { findMany: mocks.assignmentFindMany },
    transferObservation: { findMany: mocks.observationFindMany }
  }
}));

describe("MyEquipmentPage", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockReset().mockResolvedValue({ id: "user-a" });
    mocks.assignmentFindMany.mockReset().mockResolvedValue([]);
    mocks.observationFindMany.mockReset().mockResolvedValue([]);
  });

  it("keeps transferred equipment visible and inactive until the current holder returns it", async () => {
    mocks.observationFindMany.mockResolvedValue([{
      id: "observation-1",
      createdAt: new Date("2026-07-13T10:00:00.000Z"),
      equipment: {
        name: "카메라",
        assetNumber: "EQ-1",
        operationalStatus: "ACTIVE",
        assignments: [{ user: { name: "이수신" } }]
      }
    }]);

    const { default: MyEquipmentPage } = await import("./page");
    const html = renderToStaticMarkup(await MyEquipmentPage());

    expect(html).toContain("전달한 장비");
    expect(html).toContain("현재 소유권은 이수신님에게 있으며, 아직 반납되지 않았습니다.");
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain("장비 작업");
  });
});
