import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const equipmentFindMany = vi.fn();
const userFindMany = vi.fn();

vi.mock("@/server/db/client", () => ({
  prisma: {
    equipment: { findMany: equipmentFindMany },
    user: { findMany: userFindMany }
  }
}));

function findElements(node: ReactNode, predicate: (element: ReactElement) => boolean): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap((child) => findElements(child, predicate));
  if (!isValidElement(node)) return [];
  const matches = predicate(node) ? [node] : [];
  return matches.concat(findElements((node.props as { children?: ReactNode }).children, predicate));
}

function hrefs(node: ReactNode) {
  return findElements(node, (element) => typeof (element.props as { href?: unknown }).href === "string")
    .map((element) => (element.props as { href: string }).href);
}

describe("admin equipment and user directories", () => {
  beforeEach(() => {
    equipmentFindMany.mockReset();
    userFindMany.mockReset();
  });

  it("searches and paginates equipment with deterministic ordering", async () => {
    equipmentFindMany.mockResolvedValue(Array.from({ length: 51 }, (_, index) => ({
      id: `equipment-${index}`,
      assetNumber: `EQ-${index}`,
      name: "노트북",
      operationalStatus: "ACTIVE",
      assignments: [],
      transferTickets: []
    })));
    const { default: AdminEquipmentPage } = await import("./equipment/page");

    const tree = await AdminEquipmentPage({ searchParams: Promise.resolve({ q: "노트북", page: "2" }) });

    expect(equipmentFindMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 50,
      take: 51,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      where: expect.objectContaining({ retiredAt: null, OR: expect.any(Array) })
    }));
    expect(hrefs(tree)).toContain("/admin/equipment?q=%EB%85%B8%ED%8A%B8%EB%B6%81&page=1");
    expect(hrefs(tree)).toContain("/admin/equipment?q=%EB%85%B8%ED%8A%B8%EB%B6%81&page=3");
  });

  it("searches and paginates users with deterministic ordering", async () => {
    userFindMany.mockResolvedValue(Array.from({ length: 51 }, (_, index) => ({
      id: `user-${index}`,
      employeeNumber: `EMP-${index}`,
      name: "김직원",
      role: "EMPLOYEE",
      status: "ACTIVE",
      _count: { assignments: 0 }
    })));
    const { default: AdminUsersPage } = await import("./users/page");

    const tree = await AdminUsersPage({ searchParams: Promise.resolve({ q: "김직원", page: "2" }) });

    expect(userFindMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 50,
      take: 51,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      where: { OR: expect.any(Array) }
    }));
    expect(hrefs(tree)).toContain("/admin/users?q=%EA%B9%80%EC%A7%81%EC%9B%90&page=1");
    expect(hrefs(tree)).toContain("/admin/users?q=%EA%B9%80%EC%A7%81%EC%9B%90&page=3");
  });
});
