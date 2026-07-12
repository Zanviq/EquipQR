import { describe, expect, it } from "vitest";
import { getEffectiveStatus } from "./effective-status";

describe("getEffectiveStatus", () => {
  it.each([
    [{ operationalStatus: "OUT_OF_SERVICE", hasActiveAssignment: true, hasValidTicket: true }, "OUT_OF_SERVICE"],
    [{ operationalStatus: "ACTIVE", hasActiveAssignment: true, hasValidTicket: true }, "TRANSFER_PENDING"],
    [{ operationalStatus: "ACTIVE", hasActiveAssignment: true, hasValidTicket: false }, "CHECKED_OUT"],
    [{ operationalStatus: "ACTIVE", hasActiveAssignment: false, hasValidTicket: false }, "AVAILABLE"]
  ] as const)("derives status with fixed precedence", (input, expected) => {
    expect(getEffectiveStatus(input)).toBe(expected);
  });
});
