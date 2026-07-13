// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LogoutButton } from "./logout-button";

describe("LogoutButton", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each([
    ["network error", () => Promise.reject(new TypeError("offline"))],
    ["non-JSON response", () => Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError("html")) })]
  ])("releases pending and shows an error after a %s", async (_label, response) => {
    vi.stubGlobal("fetch", vi.fn(response));
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("로그아웃하지 못했습니다.");
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeEnabled();
  });
});
