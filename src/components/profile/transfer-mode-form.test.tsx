// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TransferModeForm } from "./transfer-mode-form";

describe("TransferModeForm", () => {
  it("explains that changes apply only to future checkouts", () => {
    render(<TransferModeForm current="TRANSFER_QR" />);
    expect(screen.getByText("이미 보유한 장비에는 적용되지 않습니다.")).toBeVisible();
    expect(screen.getByLabelText(/전달 QR 방식/)).toBeChecked();
  });
});
