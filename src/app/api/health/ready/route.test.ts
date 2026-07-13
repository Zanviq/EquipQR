import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  userCount: vi.fn()
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    user: { count: mocks.userCount }
  }
}));

import { GET } from "./route";

describe("GET /api/health/ready", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 when the database is reachable and an active admin exists", async () => {
    mocks.queryRaw.mockResolvedValue([{ connected: 1 }]);
    mocks.userCount.mockResolvedValue(1);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      checks: { database: "ok", activeAdmin: "ok" }
    });
    expect(mocks.userCount).toHaveBeenCalledWith({
      where: { role: "ADMIN", status: "ACTIVE" }
    });
  });

  it("returns 503 when no active admin exists", async () => {
    mocks.queryRaw.mockResolvedValue([{ connected: 1 }]);
    mocks.userCount.mockResolvedValue(0);

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "not_ready",
      checks: { database: "ok", activeAdmin: "missing" }
    });
  });

  it("returns 503 without exposing details when the database check fails", async () => {
    mocks.queryRaw.mockRejectedValue(new Error("database credentials leaked here"));

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "not_ready",
      checks: { database: "unavailable", activeAdmin: "unknown" }
    });
    expect(mocks.userCount).not.toHaveBeenCalled();
  });
});
