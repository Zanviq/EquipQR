// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TransferModeForm } from "./transfer-mode-form";

describe("TransferModeForm", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("explains that changes apply only to future checkouts", () => {
    render(<TransferModeForm current="TRANSFER_QR" />);
    expect(screen.getByText("이미 보유한 장비에는 적용되지 않습니다.")).toBeVisible();
    expect(screen.getByLabelText(/전달 QR 방식/)).toBeChecked();
  });

  it.each([
    ["network error", () => Promise.reject(new TypeError("offline"))],
    ["non-JSON response", () => Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError("html")) })],
    ["HTTP error", () => Promise.resolve({ ok: false, json: () => Promise.resolve({ message: "서버 오류" }) })]
  ])("releases pending and shows an error after a %s", async (_label, response) => {
    vi.stubGlobal("fetch", vi.fn(response));
    render(<TransferModeForm current="TRANSFER_QR" />);

    fireEvent.submit(screen.getByRole("button", { name: "설정 저장" }).closest("form")!);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("설정을 저장하지 못했습니다.");
    expect(alert).toHaveClass("notice-error");
    expect(screen.getByRole("button", { name: "설정 저장" })).toBeEnabled();
  });

  it("keeps successful feedback informational", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ defaultTransferMode: "TRANSFER_QR" })
    }));
    render(<TransferModeForm current="TRANSFER_QR" />);

    fireEvent.submit(screen.getByRole("button", { name: "설정 저장" }).closest("form")!);

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("다음 신규 대여의 전달 방식을 저장했습니다.");
    expect(status).toHaveClass("notice-info");
  });
});
