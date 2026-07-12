import { describe, expect, it } from "vitest";
import { buildEquipmentQrUrl, createPublicCode } from "./public-code";

describe("equipment public codes", () => {
  it("creates a URL-safe code with at least 128 bits", () => {
    const code = createPublicCode();
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(code, "base64url").byteLength).toBeGreaterThanOrEqual(16);
  });

  it("builds a URL containing only the public code", () => {
    const url = buildEquipmentQrUrl("https://equip.example.com", "public-code");
    expect(url.toString()).toBe("https://equip.example.com/scan/equipment/public-code");
  });
});
