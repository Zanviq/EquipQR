import { describe, expect, it } from "vitest";
import { adminEquipmentPath, adminUserPath } from "./admin-paths";

describe("admin detail paths", () => {
  it("encodes an asset number as one URL segment", () => {
    expect(adminEquipmentPath("EQ/OLD #1")).toBe("/admin/equipment/EQ%2FOLD%20%231");
  });

  it("encodes an employee number as one URL segment", () => {
    expect(adminUserPath("EMP/OLD #1")).toBe("/admin/users/EMP%2FOLD%20%231");
  });
});
