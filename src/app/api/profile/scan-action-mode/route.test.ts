import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRequestUser: vi.fn(),
  update: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ requireRequestUser: mocks.requireRequestUser }));
vi.mock("@/server/db/client", () => ({ prisma: { user: { update: mocks.update } } }));
vi.mock("@/server/http/response", () => ({
  assertSameOrigin: vi.fn(),
  domainErrorResponse: (error: unknown) => Response.json({ message: String(error) }, { status: 400 })
}));

import { PATCH } from "./route";

describe("PATCH /api/profile/scan-action-mode", () => {
  beforeEach(() => {
    mocks.requireRequestUser.mockReset().mockResolvedValue({ id: "user-1" });
    mocks.update.mockReset().mockResolvedValue({ scanActionMode: "CONFIRM" });
  });

  it("stores the current user's scan action mode", async () => {
    const response = await PATCH(new Request("https://equipqr.example/api/profile/scan-action-mode", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scanActionMode: "CONFIRM" })
    }));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { scanActionMode: "CONFIRM" },
      select: { scanActionMode: true }
    });
  });
});
