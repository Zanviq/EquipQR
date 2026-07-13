import { describe, expect, it } from "vitest";
import { normalizeAssetNumber } from "./asset-number";

describe("normalizeAssetNumber", () => {
  it("trims and uppercases a safe asset number", () => {
    expect(normalizeAssetNumber("  eq_10-24 ")).toBe("EQ_10-24");
  });

  it.each(["", "   ", "EQ 100", "EQ/100", "_EQ100", "EQ.100", "ſ", "E".repeat(101)])(
    "rejects unsafe asset number %s",
    (assetNumber) => {
      expect(() => normalizeAssetNumber(assetNumber)).toThrow("INVALID_ASSET_NUMBER");
    }
  );
});
