// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QrScanner } from "./qr-scanner";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("QrScanner", () => {
  it("offers manual entry when camera permission is unavailable", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")) }
    });
    render(<QrScanner />);
    expect(await screen.findByRole("button", { name: "자산번호로 찾기" })).toBeVisible();
  });
});
