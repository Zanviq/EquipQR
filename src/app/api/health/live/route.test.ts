import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/health/live", () => {
  it("reports that the web process is alive", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
