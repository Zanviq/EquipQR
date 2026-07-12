import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the original password and rejects another", async () => {
    const password = ["Correct", "horse", "battery", "staple", "42!"].join(" ");
    const encoded = await hashPassword(password);
    expect(encoded).not.toContain(password);
    expect(await verifyPassword(encoded, password)).toBe(true);
    expect(await verifyPassword(encoded, "wrong-password")).toBe(false);
  });
});
