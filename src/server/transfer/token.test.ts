import { describe, expect, it } from "vitest";
import { createTransferToken, hashTransferToken } from "./token";

describe("transfer tokens", () => {
  it("creates a 256-bit opaque value and stable digest", () => {
    const rawValue = createTransferToken();
    expect(Buffer.from(rawValue, "base64url")).toHaveLength(32);
    expect(hashTransferToken(rawValue)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashTransferToken(rawValue)).toBe(hashTransferToken(rawValue));
  });
});
