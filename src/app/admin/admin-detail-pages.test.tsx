import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminForm } from "@/components/admin/admin-form";

const equipmentFindUnique = vi.fn();
const userFindUnique = vi.fn();

vi.mock("@/server/db/client", () => ({
  prisma: {
    equipment: { findUnique: equipmentFindUnique },
    user: { findUnique: userFindUnique }
  }
}));

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qr") }
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));

function findElements(node: ReactNode, predicate: (element: ReactElement) => boolean): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap((child) => findElements(child, predicate));
  if (!isValidElement(node)) return [];
  const matches = predicate(node) ? [node] : [];
  return matches.concat(findElements((node.props as { children?: ReactNode }).children, predicate));
}

function hasOnlyNonFunctionDirectProps(element: ReactElement) {
  return Object.values(element.props as Record<string, unknown>).every((value) => typeof value !== "function");
}

function textContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (!isValidElement(node)) return "";
  return textContent((node.props as { children?: ReactNode }).children);
}

describe("admin detail pages", () => {
  beforeEach(() => {
    equipmentFindUnique.mockResolvedValue({
      id: "equipment-1",
      assetNumber: "EQ-0012",
      name: "업무용 노트북",
      note: null,
      publicCode: "public-code",
      operationalStatus: "ACTIVE",
      assignments: [],
      transferTickets: [],
      auditEvents: []
    });
    userFindUnique.mockResolvedValue({
      id: "user-1",
      employeeNumber: "EMP-001",
      name: "관리자",
      role: "ADMIN",
      status: "ACTIVE",
      assignments: []
    });
  });

  it("uses only serializable AdminForm props on equipment detail", async () => {
    const { default: AdminEquipmentDetail } = await import("./equipment/[assetNumber]/page");
    const tree = await AdminEquipmentDetail({ params: Promise.resolve({ assetNumber: "EQ-0012" }) });
    const forms = findElements(tree, (element) => element.type === AdminForm);

    expect(forms).toHaveLength(3);
    expect(forms.every(hasOnlyNonFunctionDirectProps)).toBe(true);
    expect(findElements(forms[1], (element) => element.type === "input" && (element.props as { name?: string }).name === "status")).toHaveLength(1);
    expect((forms[2].props as { nullFields?: string[] }).nullFields).toEqual(["nextEmployeeNumber"]);
  });

  it("encodes the asset number in equipment API endpoints", async () => {
    equipmentFindUnique.mockResolvedValueOnce({
      id: "equipment-legacy",
      assetNumber: "EQ/LEGACY #1",
      name: "업무용 노트북",
      note: null,
      publicCode: "public-code",
      operationalStatus: "ACTIVE",
      assignments: [],
      transferTickets: [],
      auditEvents: []
    });
    const { default: AdminEquipmentDetail } = await import("./equipment/[assetNumber]/page");
    const tree = await AdminEquipmentDetail({ params: Promise.resolve({ assetNumber: "EQ/LEGACY #1" }) });
    const endpoints = findElements(tree, (element) => element.type === AdminForm)
      .map((form) => (form.props as { endpoint: string }).endpoint);

    expect(endpoints).toEqual([
      "/api/admin/equipment/EQ%2FLEGACY%20%231/details",
      "/api/admin/equipment/EQ%2FLEGACY%20%231",
      "/api/admin/equipment/EQ%2FLEGACY%20%231/reassign"
    ]);
  });

  it("renders localized equipment audit labels and before/after metadata", async () => {
    equipmentFindUnique.mockResolvedValueOnce({
      id: "equipment-audit",
      assetNumber: "EQ-0012",
      name: "새 노트북",
      note: "새 비고",
      publicCode: "public-code",
      operationalStatus: "OUT_OF_SERVICE",
      assignments: [],
      transferTickets: [],
      auditEvents: [{
        id: "audit-1",
        eventType: "EQUIPMENT_UPDATED",
        previousUser: null,
        nextUser: null,
        actorUser: { name: "관리자" },
        reason: null,
        metadata: {
          before: { name: "기존 노트북", note: "기존 비고" },
          after: { name: "새 노트북", note: "새 비고" }
        },
        occurredAt: new Date("2026-07-13T00:00:00.000Z")
      }]
    });
    const { default: AdminEquipmentDetail } = await import("./equipment/[assetNumber]/page");

    const tree = await AdminEquipmentDetail({ params: Promise.resolve({ assetNumber: "EQ-0012" }) });
    const rendered = textContent(tree);

    expect(rendered).toContain("장비 수정");
    expect(rendered).toContain("장비명: 기존 노트북 → 새 노트북");
    expect(rendered).toContain("비고: 기존 비고 → 새 비고");
    expect(rendered).not.toContain("EQUIPMENT_UPDATED");
  });

  it("shows an empty state when equipment has no recent audit events", async () => {
    const { default: AdminEquipmentDetail } = await import("./equipment/[assetNumber]/page");

    const tree = await AdminEquipmentDetail({ params: Promise.resolve({ assetNumber: "EQ-0012" }) });

    expect(textContent(tree)).toContain("아직 변경 기록이 없습니다.");
  });

  it("uses only serializable AdminForm props on user detail", async () => {
    const { default: AdminUserPage } = await import("./users/[employeeNumber]/page");
    const tree = await AdminUserPage({ params: Promise.resolve({ employeeNumber: "EMP-001" }) });
    const forms = findElements(tree, (element) => element.type === AdminForm);

    expect(forms).toHaveLength(2);
    expect(forms.every(hasOnlyNonFunctionDirectProps)).toBe(true);
    expect(findElements(forms[0], (element) => element.type === "input" && (element.props as { name?: string }).name === "status")).toHaveLength(1);
  });

  it("encodes the employee number in user API endpoints", async () => {
    userFindUnique.mockResolvedValueOnce({
      id: "user-legacy",
      employeeNumber: "EMP/LEGACY #1",
      name: "관리자",
      role: "ADMIN",
      status: "ACTIVE",
      assignments: []
    });
    const { default: AdminUserPage } = await import("./users/[employeeNumber]/page");
    const tree = await AdminUserPage({ params: Promise.resolve({ employeeNumber: "EMP/LEGACY #1" }) });
    const endpoints = findElements(tree, (element) => element.type === AdminForm)
      .map((form) => (form.props as { endpoint: string }).endpoint);

    expect(endpoints).toEqual([
      "/api/admin/users/EMP%2FLEGACY%20%231",
      "/api/admin/users/EMP%2FLEGACY%20%231/reset-password"
    ]);
  });
});
