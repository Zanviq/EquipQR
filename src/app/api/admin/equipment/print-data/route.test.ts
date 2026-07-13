import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRequestUser: vi.fn(),
  findMany: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ requireRequestUser: mocks.requireRequestUser }));
vi.mock("@/server/db/client", () => ({ prisma: { equipment: { findMany: mocks.findMany } } }));
vi.mock("@/server/http/response", () => ({
  assertSameOrigin: vi.fn(),
  domainErrorResponse: (error: unknown) => Response.json({ message: String(error) }, { status: 400 })
}));

import { POST } from "./route";

describe("POST /api/admin/equipment/print-data", () => {
  beforeEach(() => {
    process.env.APP_ORIGIN = "https://equipqr.example";
    mocks.requireRequestUser.mockReset().mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mocks.findMany.mockReset().mockResolvedValue([
      { id: "11111111-1111-4111-8111-111111111111", name: "카메라", assetNumber: "EQ-1", publicCode: "code-1" },
      { id: "22222222-2222-4222-8222-222222222222", name: "노트북", assetNumber: "EQ-2", publicCode: "code-2" }
    ]);
  });

  it("returns canonical QR data in submitted selection order", async () => {
    const ids = ["22222222-2222-4222-8222-222222222222", "11111111-1111-4111-8111-111111111111"];
    const response = await POST(new Request("https://equipqr.example/api/admin/equipment/print-data", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids })
    }));
    const body = await response.json();

    expect(mocks.requireRequestUser).toHaveBeenCalledWith(expect.any(Request), "ADMIN");
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { id: { in: ids }, retiredAt: null },
      select: { id: true, name: true, assetNumber: true, publicCode: true }
    });
    expect(body.items.map((item: { id: string }) => item.id)).toEqual(ids);
    expect(body.items[0].qrUrl).toBe("https://equipqr.example/scan/equipment/code-2");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
