// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QrScanner } from "./qr-scanner";

const scanner = vi.hoisted(() => ({
  callback: undefined as undefined | ((result?: { getText(): string }) => void),
  stop: vi.fn()
}));

vi.mock("@zxing/browser", () => ({
  BrowserQRCodeReader: class {
    async decodeFromStream(_stream: MediaStream, _video: HTMLVideoElement, callback: (result?: { getText(): string }) => void) {
      scanner.callback = callback;
      return { stop: scanner.stop };
    }
  }
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("QrScanner", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    scanner.callback = undefined;
    scanner.stop.mockReset();
  });

  it("offers manual entry when camera permission is unavailable", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")) }
    });
    render(<QrScanner />);
    expect(await screen.findByRole("button", { name: "자산번호로 찾기" })).toBeVisible();
  });

  it.each([
    ["network error", () => Promise.reject(new TypeError("offline"))],
    ["non-JSON response", () => Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError("html")) })]
  ])("releases manual lookup pending and shows an error after a %s", async (_label, response) => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")) }
    });
    vi.stubGlobal("fetch", vi.fn(response));
    render(<QrScanner />);

    fireEvent.click(screen.getByRole("button", { name: "자산번호로 찾기" }));
    fireEvent.change(screen.getByLabelText("자산번호"), { target: { value: "EQ-0012" } });
    fireEvent.submit(screen.getByRole("button", { name: "장비 찾기" }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("장비를 찾을 수 없습니다.");
    expect(screen.getByRole("button", { name: "장비 찾기" })).toBeEnabled();
  });

  it.each([
    ["malformed QR", "not-an-equipqr-code"],
    ["another service QR", "https://example.com/transfer/token-1"]
  ])("shows feedback for a %s", async (_label, value) => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) }
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    render(<QrScanner />);
    await waitFor(() => expect(scanner.callback).toBeTypeOf("function"));

    act(() => scanner.callback?.({ getText: () => value }));

    expect(screen.getByRole("alert")).toHaveTextContent("EquipQR 장비 또는 전달 QR을 스캔해 주세요.");
  });
});
