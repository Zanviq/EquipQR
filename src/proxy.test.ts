import { describe, expect, it } from "vitest";
import { employeeReturnTo } from "./proxy";

describe("employee authentication return path", () => {
  it("preserves an equipment or one-time transfer QR path and query", () => {
    expect(employeeReturnTo(new URL("https://equipqr.example/transfer/secret-token?source=qr")))
      .toBe("/transfer/secret-token?source=qr");
  });
});
