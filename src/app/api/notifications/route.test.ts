import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRequestUser: vi.fn(),
  findMany: vi.fn(),
  updateMany: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ requireRequestUser: mocks.requireRequestUser }));
vi.mock("@/server/db/client", () => ({
  prisma: { userNotification: { findMany: mocks.findMany, updateMany: mocks.updateMany } }
}));
vi.mock("@/server/http/response", () => ({
  assertSameOrigin: vi.fn(),
  domainErrorResponse: (error: unknown) => Response.json({ message: String(error) }, { status: 400 })
}));

import { GET, PATCH } from "./route";

describe("notifications API", () => {
  beforeEach(() => {
    mocks.requireRequestUser.mockReset().mockResolvedValue({ id: "user-a" });
    mocks.findMany.mockReset();
    mocks.updateMany.mockReset().mockResolvedValue({ count: 1 });
  });

  it("returns only the current user's unread transfer notifications", async () => {
    mocks.findMany.mockResolvedValue([{
      auditEventId: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-07-13T10:00:00.000Z"),
      auditEvent: {
        previousUserId: "user-a",
        equipment: { name: "카메라" },
        previousUser: { name: "김전달" },
        nextUser: { name: "이수신" }
      }
    }]);

    const response = await GET(new Request("https://equipqr.example/api/notifications"));
    const body = await response.json();

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-a", readAt: null }, take: 10 }));
    expect(body.notifications[0]).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      title: "전달이 완료되었습니다.",
      message: "카메라 장비가 이수신님에게 전달되었습니다."
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("marks only the current user's notifications as read", async () => {
    const id = "22222222-2222-4222-8222-222222222222";
    const response = await PATCH(new Request("https://equipqr.example/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ auditEventIds: [id] })
    }));

    expect(response.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-a", auditEventId: { in: [id] }, readAt: null },
      data: { readAt: expect.any(Date) }
    });
  });
});
