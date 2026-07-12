// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() })
}));

describe("LoginForm", () => {
  it("uses visible labels and password autocomplete", () => {
    render(<LoginForm returnTo="/scan" />);
    expect(screen.getByLabelText("사번")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("비밀번호")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("button", { name: "로그인" })).toBeVisible();
  });
});
