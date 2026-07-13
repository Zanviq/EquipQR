// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminForm } from "./admin-form";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh })
}));

describe("AdminForm", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    refresh.mockReset();
  });

  it("resets the submitted form and refreshes after success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true })
    }));
    render(
      <AdminForm endpoint="/api/admin/equipment" submitLabel="저장">
        <label>
          장비명
          <input name="name" defaultValue="업무용 노트북" />
        </label>
      </AdminForm>
    );
    fireEvent.change(screen.getByLabelText("장비명"), { target: { value: "변경된 이름" } });

    fireEvent.submit(screen.getByRole("button", { name: "저장" }).closest("form")!);

    expect(await screen.findByText("처리했습니다.")).toBeVisible();
    await waitFor(() => expect(screen.getByLabelText("장비명")).toHaveValue("업무용 노트북"));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("converts only declared empty fields to null", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true })
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <AdminForm endpoint="/api/admin/equipment/EQ-0012/reassign" submitLabel="책임자 변경" nullFields={["nextEmployeeNumber"]}>
        <input name="nextEmployeeNumber" defaultValue="" />
        <textarea name="reason" defaultValue="재고 정리" />
      </AdminForm>
    );

    fireEvent.submit(screen.getByRole("button", { name: "책임자 변경" }).closest("form")!);

    expect(await screen.findByText("처리했습니다.")).toBeVisible();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      nextEmployeeNumber: null,
      reason: "재고 정리"
    });
  });

  it("keeps a hidden status value in the request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true })
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <AdminForm endpoint="/api/admin/equipment/EQ-0012" method="PATCH" submitLabel="사용 중지">
        <input type="hidden" name="status" value="OUT_OF_SERVICE" />
        <textarea name="reason" defaultValue="수리 필요" />
      </AdminForm>
    );

    fireEvent.submit(screen.getByRole("button", { name: "사용 중지" }).closest("form")!);

    expect(await screen.findByText("처리했습니다.")).toBeVisible();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      status: "OUT_OF_SERVICE",
      reason: "수리 필요"
    });
  });
});
