import { describe, expect, it } from "vitest";
import { equipmentWorkPath, scanActionModeForEntry } from "./equipment-entry";

describe("equipment entry intent", () => {
  it("forces confirmation only for an internal equipment-work entry", () => {
    expect(scanActionModeForEntry("IMMEDIATE", "1")).toBe("CONFIRM");
    expect(scanActionModeForEntry("IMMEDIATE", undefined)).toBe("IMMEDIATE");
    expect(scanActionModeForEntry("CONFIRM", undefined)).toBe("CONFIRM");
  });

  it("marks internal equipment-work links without changing printed QR paths", () => {
    expect(equipmentWorkPath("PUBLIC / 1")).toBe("/scan/equipment/PUBLIC%20%2F%201?manual=1");
  });
});
