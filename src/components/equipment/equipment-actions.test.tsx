// @vitest-environment jsdom
import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EquipmentActions } from "./equipment-actions";

const refresh = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace })
}));

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qr") }
}));

describe("EquipmentActions", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    refresh.mockReset();
    replace.mockReset();
  });

  it.each([
    ["CHECKOUT", "/api/equipment/PUBLIC-1/checkout"],
    ["RETURN", "/api/equipment/PUBLIC-1/return"]
  ] as const)("automatically runs %s once and leaves the equipment page", async (action, endpoint) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ message: "완료했습니다." })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<StrictMode><EquipmentActions publicCode="PUBLIC-1" actions={[action]} scanActionMode="IMMEDIATE" /></StrictMode>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/my-equipment"));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(endpoint, { method: "POST" });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("keeps the checkout button in confirmation mode", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<EquipmentActions publicCode="PUBLIC-1" actions={["CHECKOUT"]} scanActionMode="CONFIRM" />);

    expect(screen.getByRole("button", { name: "대여하기" })).toBeEnabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["network error", () => Promise.reject(new TypeError("offline"))],
    ["non-JSON response", () => Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError("html")) })]
  ])("releases pending and shows an error after a %s", async (_label, response) => {
    vi.stubGlobal("fetch", vi.fn(response));
    render(<EquipmentActions publicCode="PUBLIC-1" actions={["CHECKOUT"]} scanActionMode="CONFIRM" />);

    fireEvent.click(screen.getByRole("button", { name: "대여하기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("작업을 완료하지 못했습니다.");
    expect(screen.getByRole("button", { name: "대여하기" })).toBeEnabled();
  });

  it("finishes an instant transfer once and leaves before automatic return can run", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ message: "전달을 완료했습니다." })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<StrictMode><EquipmentActions publicCode="PUBLIC-1" actions={["INSTANT_TRANSFER"]} scanActionMode="CONFIRM" /></StrictMode>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/my-equipment"));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("keeps the current transfer ticket when cancellation fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ ticketId: "ticket-1", token: "token-1", expiresAt: new Date(Date.now() + 600_000).toISOString() })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ message: "전달 QR을 취소하지 못했습니다." })
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<EquipmentActions publicCode="PUBLIC-1" actions={["CREATE_TRANSFER_TICKET"]} scanActionMode="CONFIRM" />);

    fireEvent.click(screen.getByRole("button", { name: "전달 QR 만들기" }));
    expect(await screen.findByRole("img", { name: /장비 전달 QR/ })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "전달 QR 취소" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("전달 QR을 취소하지 못했습니다.");
    expect(screen.getByRole("img", { name: /장비 전달 QR/ })).toBeVisible();
    await waitFor(() => expect(screen.getByRole("button", { name: "전달 QR 취소" })).toBeEnabled());
  });
});
