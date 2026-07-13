// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminLayout from "./layout";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) => <a {...props}>{children}</a>
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  usePathname: () => "/admin"
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: "user-1", role: "ADMIN", name: "관리자", employeeNumber: "A001" })
}));

describe("AdminLayout", () => {
  it("offers logout from the mobile administrator header", async () => {
    render(await AdminLayout({ children: <main>관리 화면</main> }));

    expect(within(screen.getByRole("banner")).getByRole("button", { name: "로그아웃" })).toBeVisible();
  });
});
