// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EquipmentPrintSelection } from "./equipment-print-selection";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const items = [
  { id: "11111111-1111-4111-8111-111111111111", assetNumber: "EQ-1", name: "카메라", status: "AVAILABLE" as const, currentUser: null, manageHref: "/admin/equipment/EQ-1" },
  { id: "22222222-2222-4222-8222-222222222222", assetNumber: "EQ-2", name: "노트북", status: "CHECKED_OUT" as const, currentUser: "김직원", manageHref: "/admin/equipment/EQ-2" }
];

describe("EquipmentPrintSelection", () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    push.mockReset();
  });

  it("stores selected equipment across pages and opens print preview", async () => {
    render(<EquipmentPrintSelection items={items} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /카메라/ }));
    expect(screen.getByText("1개 선택됨")).toBeVisible();
    await waitFor(() => expect(JSON.parse(sessionStorage.getItem("equipqr:print-equipment") ?? "[]")).toEqual([items[0].id]));

    fireEvent.click(screen.getByRole("button", { name: "선택한 QR 인쇄" }));
    expect(push).toHaveBeenCalledWith("/admin/equipment/print");
  });

  it("selects every item on the current page", () => {
    render(<EquipmentPrintSelection items={items} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "현재 페이지 전체 선택" }));
    expect(screen.getByText("2개 선택됨")).toBeVisible();
  });
});
