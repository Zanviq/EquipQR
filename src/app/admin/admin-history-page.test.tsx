import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auditFindMany = vi.fn();

vi.mock("@/server/db/client", () => ({
  prisma: { auditEvent: { findMany: auditFindMany } }
}));

function findElements(node: ReactNode, predicate: (element: ReactElement) => boolean): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap((child) => findElements(child, predicate));
  if (!isValidElement(node)) return [];
  const matches = predicate(node) ? [node] : [];
  return matches.concat(findElements((node.props as { children?: ReactNode }).children, predicate));
}

function textContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (!isValidElement(node)) return "";
  return textContent((node.props as { children?: ReactNode }).children);
}

function event(index: number) {
  return {
    id: `audit-${index.toString().padStart(3, "0")}`,
    eventType: "EQUIPMENT_UPDATED",
    occurredAt: new Date("2026-07-13T00:00:00.000Z"),
    equipment: { name: "새 노트북", assetNumber: "EQ-0012" },
    actorUser: { name: "관리자", employeeNumber: "ADMIN-1" },
    previousUser: null,
    nextUser: null,
    reason: null,
    metadata: {
      before: { name: "기존 노트북", note: "기존 비고" },
      after: { name: "새 노트북", note: "새 비고" }
    }
  };
}

describe("admin history page", () => {
  beforeEach(() => auditFindMany.mockReset());

  it("paginates in deterministic order and keeps the search query in previous and next links", async () => {
    auditFindMany.mockResolvedValue(Array.from({ length: 51 }, (_, index) => event(index)));
    const { default: AdminHistoryPage } = await import("./history/page");

    const tree = await AdminHistoryPage({ searchParams: Promise.resolve({ q: "노트북", page: "2" }) });

    expect(auditFindMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 50,
      take: 51,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      where: expect.objectContaining({ OR: expect.any(Array) })
    }));
    const hrefs = findElements(tree, (element) => typeof (element.props as { href?: unknown }).href === "string")
      .map((element) => (element.props as { href: string }).href);
    expect(hrefs).toContain("/admin/history?q=%EB%85%B8%ED%8A%B8%EB%B6%81&page=1");
    expect(hrefs).toContain("/admin/history?q=%EB%85%B8%ED%8A%B8%EB%B6%81&page=3");
  });

  it("renders audit metadata as localized before and after changes", async () => {
    auditFindMany.mockResolvedValue([event(1)]);
    const { default: AdminHistoryPage } = await import("./history/page");

    const tree = await AdminHistoryPage({ searchParams: Promise.resolve({}) });
    const rendered = textContent(tree);

    expect(rendered).toContain("장비명: 기존 노트북 → 새 노트북");
    expect(rendered).toContain("비고: 기존 비고 → 새 비고");
    expect(rendered).not.toContain("EQUIPMENT_UPDATED");
  });
});
