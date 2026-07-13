// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScanActionModeForm } from "./scan-action-mode-form";

describe("ScanActionModeForm", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("offers immediate and confirmation modes", () => {
    render(<ScanActionModeForm current="IMMEDIATE" />);

    expect(screen.getByLabelText(/즉시 대여·반납/)).toBeChecked();
    expect(screen.getByLabelText(/버튼으로 확인/)).not.toBeChecked();
  });

  it("saves confirmation mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ scanActionMode: "CONFIRM" })
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ScanActionModeForm current="IMMEDIATE" />);

    fireEvent.click(screen.getByLabelText(/버튼으로 확인/));
    fireEvent.click(screen.getByRole("button", { name: "스캔 설정 저장" }));

    expect(await screen.findByRole("status")).toHaveTextContent("QR 처리 방식을 저장했습니다.");
    expect(fetchMock).toHaveBeenCalledWith("/api/profile/scan-action-mode", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ scanActionMode: "CONFIRM" })
    }));
  });
});
