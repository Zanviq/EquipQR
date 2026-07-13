// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BulkQrPrint } from "./bulk-qr-print";

vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn((value: string) => Promise.resolve(`data:image/png;base64,${value}`)) } }));

describe("BulkQrPrint", () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("prints only selected equipment and recalculates A4 placement from label size", async () => {
    const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
    sessionStorage.setItem("equipqr:print-equipment", JSON.stringify(ids));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ items: [
        { id: ids[0], name: "카메라", assetNumber: "EQ-1", qrUrl: "https://equipqr.example/scan/equipment/code-1" },
        { id: ids[1], name: "노트북", assetNumber: "EQ-2", qrUrl: "https://equipqr.example/scan/equipment/code-2" }
      ] })
    });
    const print = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("print", print);

    render(<BulkQrPrint />);

    expect(await screen.findByText("2개 라벨 · 1페이지")).toBeVisible();
    expect(screen.getAllByRole("img", { name: /QR/ })).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/equipment/print-data", expect.objectContaining({ body: JSON.stringify({ ids }) }));

    fireEvent.change(screen.getByRole("slider", { name: "라벨 너비" }), { target: { value: "60" } });
    expect(screen.getByText(/3열 × 7행/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "인쇄하기" }));
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
  });
});
