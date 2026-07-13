// @vitest-environment jsdom
import { StrictMode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AcceptTransfer } from "./accept-transfer";

describe("AcceptTransfer", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each([
    ["network error", () => Promise.reject(new TypeError("offline"))],
    ["non-JSON response", () => Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError("html")) })]
  ])("leaves pending and shows an error after a %s", async (_label, response) => {
    vi.stubGlobal("fetch", vi.fn(response));
    render(<AcceptTransfer token="token-1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("전달 요청을 처리하지 못했습니다.");
    expect(screen.queryByText("확인 중…")).not.toBeInTheDocument();
  });

  it("accepts a transfer only once in React StrictMode", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        message: "전달을 완료했습니다.",
        previousUserName: "김이전",
        nextUserName: "박신규",
        transferMode: "TRANSFER_QR"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<StrictMode><AcceptTransfer token="token-1" /></StrictMode>);

    expect(await screen.findByText("전달을 완료했습니다.")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
