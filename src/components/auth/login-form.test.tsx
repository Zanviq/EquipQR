// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() })
}));

describe("LoginForm", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uses visible labels and password autocomplete", () => {
    render(<LoginForm returnTo="/scan" />);
    expect(screen.getByLabelText("사번")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("비밀번호")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("button", { name: "로그인" })).toBeVisible();
  });

  it.each([
    ["network error", () => Promise.reject(new TypeError("offline"))],
    ["non-JSON response", () => Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError("html")) })]
  ])("releases pending and shows an error after a %s", async (_label, response) => {
    vi.stubGlobal("fetch", vi.fn(response));
    render(<LoginForm returnTo="/scan" />);

    fireEvent.change(screen.getByLabelText("사번"), { target: { value: "E001" } });
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "secret" } });
    fireEvent.submit(screen.getByRole("button", { name: "로그인" }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("로그인하지 못했습니다.");
    expect(screen.getByRole("button", { name: "로그인" })).toBeEnabled();
  });
});
