import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./safe-return-to";

describe("safeReturnTo", () => {
  it("keeps internal QR paths and rejects network-path and backslash redirects", () => {
    expect(safeReturnTo("/transfer/token?from=qr")).toBe("/transfer/token?from=qr");
    expect(safeReturnTo("//evil.example/path")).toBe("/scan");
    expect(safeReturnTo("/\\evil.example/path")).toBe("/scan");
  });
});
