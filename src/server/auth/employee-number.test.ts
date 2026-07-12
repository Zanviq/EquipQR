import { describe, expect, it } from "vitest";
import { normalizeEmployeeNumber } from "./employee-number";

describe("normalizeEmployeeNumber", () => {
  it("trims and uppercases an employee number", () => {
    expect(normalizeEmployeeNumber("  ab-1024 ")).toBe("AB-1024");
  });

  it("rejects an empty employee number", () => {
    expect(() => normalizeEmployeeNumber("   ")).toThrow("INVALID_EMPLOYEE_NUMBER");
  });
});
