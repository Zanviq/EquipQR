import { describe, expect, it } from "vitest";
import { calculateQrPrintLayout } from "./qr-print-layout";

describe("calculateQrPrintLayout", () => {
  it("fits twenty-four 50x30mm labels on one A4 page", () => {
    expect(calculateQrPrintLayout({ labelWidthMm: 50, labelHeightMm: 30, itemCount: 25 })).toEqual({
      columns: 3,
      rows: 8,
      perPage: 24,
      pageCount: 2
    });
  });

  it("rejects labels outside the supported print range", () => {
    expect(() => calculateQrPrintLayout({ labelWidthMm: 20, labelHeightMm: 20, itemCount: 1 })).toThrow();
    expect(() => calculateQrPrintLayout({ labelWidthMm: 200, labelHeightMm: 100, itemCount: 1 })).toThrow();
  });
});
