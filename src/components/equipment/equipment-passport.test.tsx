// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EquipmentPassport } from "./equipment-passport";
import { StatusBadge } from "./status-badge";

describe("equipment passport", () => {
  it("renders the shared transfer status label", () => {
    render(<StatusBadge status="TRANSFER_PENDING" />);
    expect(screen.getByText("전달 진행 중")).toBeVisible();
  });

  it("presents asset identity and holder information", () => {
    render(
      <EquipmentPassport
        name="업무용 노트북"
        assetNumber="EQ-0012"
        status="CHECKED_OUT"
        meta="2026. 7. 12. 대여"
      />
    );
    expect(screen.getByText("EQ-0012")).toHaveClass("font-data");
    expect(screen.getByRole("heading", { name: "업무용 노트북" })).toBeVisible();
  });
});
