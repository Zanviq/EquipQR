import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  changeResponsibility: vi.fn(),
  createEquipment: vi.fn(),
  createUser: vi.fn(),
  requireRequestUser: vi.fn(),
  resetUserPassword: vi.fn(),
  setEquipmentStatus: vi.fn(),
  setUserStatus: vi.fn(),
  updateEquipmentDetails: vi.fn(),
  equipmentFindUnique: vi.fn(),
  userFindUnique: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ requireRequestUser: mocks.requireRequestUser }));
vi.mock("@/server/admin/equipment", () => ({
  changeResponsibility: mocks.changeResponsibility,
  createEquipment: mocks.createEquipment,
  setEquipmentStatus: mocks.setEquipmentStatus,
  updateEquipmentDetails: mocks.updateEquipmentDetails
}));
vi.mock("@/server/admin/users", () => ({
  createUser: mocks.createUser,
  resetUserPassword: mocks.resetUserPassword,
  setUserStatus: mocks.setUserStatus
}));
vi.mock("@/server/db/client", () => ({
  prisma: {
    equipment: { findUnique: mocks.equipmentFindUnique },
    user: { findUnique: mocks.userFindUnique }
  }
}));

import { POST as postEquipment } from "./equipment/route";
import { POST as postUser } from "./users/route";
import { PATCH as patchEquipmentStatus } from "./equipment/[assetNumber]/route";
import { PATCH as patchEquipmentDetails } from "./equipment/[assetNumber]/details/route";
import { POST as postEquipmentReassign } from "./equipment/[assetNumber]/reassign/route";
import { PATCH as patchUserStatus } from "./users/[employeeNumber]/route";
import { POST as postResetPassword } from "./users/[employeeNumber]/reset-password/route";

function request(path: string, body: string) {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body
  });
}

const unsafeIdentifierCases: Array<{
  name: string;
  handle: (request: Request) => Promise<Response>;
  path: string;
  input: unknown;
  findUnique: ReturnType<typeof vi.fn>;
}> = [
  {
    name: "equipment status",
    handle: (request) => patchEquipmentStatus(request, { params: Promise.resolve({ assetNumber: "EQ/BAD" }) }),
    path: "/api/admin/equipment/EQ%2FBAD",
    input: { status: "OUT_OF_SERVICE", reason: "고장" },
    findUnique: mocks.equipmentFindUnique
  },
  {
    name: "equipment reassignment",
    handle: (request) => postEquipmentReassign(request, { params: Promise.resolve({ assetNumber: "EQ/BAD" }) }),
    path: "/api/admin/equipment/EQ%2FBAD/reassign",
    input: { reason: "회수" },
    findUnique: mocks.equipmentFindUnique
  },
  {
    name: "user status",
    handle: (request) => patchUserStatus(request, { params: Promise.resolve({ employeeNumber: "EMP/BAD" }) }),
    path: "/api/admin/users/EMP%2FBAD",
    input: { status: "INACTIVE" },
    findUnique: mocks.userFindUnique
  },
  {
    name: "password reset",
    handle: (request) => postResetPassword(request, { params: Promise.resolve({ employeeNumber: "EMP/BAD" }) }),
    path: "/api/admin/users/EMP%2FBAD/reset-password",
    input: { password: "long-enough-password" },
    findUnique: mocks.userFindUnique
  }
];

describe("admin route validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRequestUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mocks.createEquipment.mockResolvedValue({ assetNumber: "EQ-100" });
    mocks.createUser.mockResolvedValue({ id: "user-1", employeeNumber: "EMP-100" });
    mocks.equipmentFindUnique.mockResolvedValue({ id: "equipment-1", assetNumber: "EQ-100" });
    mocks.userFindUnique.mockResolvedValue({ id: "user-1", employeeNumber: "EMP-100" });
    mocks.changeResponsibility.mockResolvedValue({});
    mocks.resetUserPassword.mockResolvedValue({});
    mocks.setEquipmentStatus.mockResolvedValue({});
    mocks.setUserStatus.mockResolvedValue({});
    mocks.updateEquipmentDetails.mockResolvedValue({ id: "equipment-1" });
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await postEquipment(request("/api/admin/equipment", "{"));

    expect(response.status).toBe(400);
    expect(mocks.createEquipment).not.toHaveBeenCalled();
  });

  it.each([
    ["equipment", postEquipment, "/api/admin/equipment", { assetNumber: "EQ-100", name: "   " }],
    ["user", postUser, "/api/admin/users", { employeeNumber: "EMP-100", name: "   ", password: "long-enough-password" }]
  ])("rejects a whitespace-only %s name", async (_type, handler, path, input) => {
    const response = await handler(request(path, JSON.stringify(input)));

    expect(response.status).toBe(400);
  });

  it("rejects a whitespace-only equipment name update", async () => {
    const response = await patchEquipmentDetails(
      request("/api/admin/equipment/EQ-100/details", JSON.stringify({ name: "   " })),
      { params: Promise.resolve({ assetNumber: "EQ-100" }) }
    );

    expect(response.status).toBe(400);
    expect(mocks.updateEquipmentDetails).not.toHaveBeenCalled();
  });

  it("normalizes identifiers before invoking admin operations", async () => {
    await postEquipment(request("/api/admin/equipment", JSON.stringify({ assetNumber: " eq-100 ", name: " 노트북 " })));
    await postUser(request("/api/admin/users", JSON.stringify({ employeeNumber: " emp-100 ", name: " 홍길동 ", password: "long-enough-password" })));

    expect(mocks.createEquipment).toHaveBeenCalledWith(expect.objectContaining({ assetNumber: "EQ-100", name: "노트북" }));
    expect(mocks.createUser).toHaveBeenCalledWith(expect.objectContaining({ employeeNumber: "EMP-100", name: "홍길동" }));
  });

  it.each([
    [postEquipment, "/api/admin/equipment", { assetNumber: "EQ/100", name: "노트북" }],
    [postUser, "/api/admin/users", { employeeNumber: "EMP 100", name: "홍길동", password: "long-enough-password" }],
    [postEquipment, "/api/admin/equipment", { assetNumber: "ſ", name: "노트북" }],
    [postUser, "/api/admin/users", { employeeNumber: "ſ", name: "홍길동", password: "long-enough-password" }]
  ])("rejects identifiers containing unsafe URL characters", async (handler, path, input) => {
    const response = await handler(request(path, JSON.stringify(input)));
    expect(response.status).toBe(400);
  });

  it("maps a duplicate user constraint to 409", async () => {
    mocks.createUser.mockRejectedValue({ code: "P2002", message: "unique constraint details" });
    const response = await postUser(request("/api/admin/users", JSON.stringify({ employeeNumber: "EMP-100", name: "홍길동", password: "long-enough-password" })));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "DUPLICATE_RESOURCE" });
  });

  it.each(unsafeIdentifierCases)("returns 400 for a nonexistent unsafe identifier on $name", async ({ handle, path, input, findUnique }) => {
    findUnique.mockResolvedValueOnce(null);

    const response = await handle(request(path, JSON.stringify(input)));

    expect(response.status).toBe(400);
  });

  it("trims and uppercases identifiers before route lookup", async () => {
    await patchEquipmentStatus(
      request("/api/admin/equipment/EQ-100", JSON.stringify({ status: "OUT_OF_SERVICE", reason: "고장" })),
      { params: Promise.resolve({ assetNumber: "  eq-100  " }) }
    );
    await patchUserStatus(
      request("/api/admin/users/EMP-100", JSON.stringify({ status: "INACTIVE" })),
      { params: Promise.resolve({ employeeNumber: "  emp-100  " }) }
    );

    expect(mocks.equipmentFindUnique).toHaveBeenCalledWith({ where: { assetNumber: "EQ-100" } });
    expect(mocks.userFindUnique).toHaveBeenCalledWith({ where: { employeeNumber: "EMP-100" } });
  });

  it("trims and uppercases the next employee number before reassignment", async () => {
    mocks.userFindUnique.mockResolvedValueOnce({ id: "user-next", employeeNumber: "EMP-200" });

    const response = await postEquipmentReassign(
      request("/api/admin/equipment/EQ-100/reassign", JSON.stringify({ nextEmployeeNumber: "  emp-200  ", reason: "팀 이동" })),
      { params: Promise.resolve({ assetNumber: "EQ-100" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.userFindUnique).toHaveBeenCalledWith({ where: { employeeNumber: "EMP-200" } });
    expect(mocks.changeResponsibility).toHaveBeenCalledWith(expect.objectContaining({ nextUserId: "user-next" }));
  });

  it("does not resolve a Unicode uppercase alias to an ASCII identifier", async () => {
    mocks.equipmentFindUnique.mockImplementationOnce(async ({ where }: { where: { assetNumber: string } }) =>
      where.assetNumber === "S" ? { id: "equipment-safe", assetNumber: "S" } : null
    );

    const response = await patchEquipmentStatus(
      request("/api/admin/equipment/%C5%BF", JSON.stringify({ status: "OUT_OF_SERVICE", reason: "고장" })),
      { params: Promise.resolve({ assetNumber: "ſ" }) }
    );

    expect(response.status).toBe(400);
    expect(mocks.equipmentFindUnique).toHaveBeenCalledWith({ where: { assetNumber: "ſ" } });
    expect(mocks.setEquipmentStatus).not.toHaveBeenCalled();
  });

  it.each([
    ["asset number", "E".repeat(101), patchEquipmentStatus, mocks.equipmentFindUnique],
    ["employee number", "E".repeat(65), patchUserStatus, mocks.userFindUnique]
  ])("returns 400 for a nonexistent overlong %s", async (_name, identifier, handler, findUnique) => {
    findUnique.mockResolvedValueOnce(null);
    const isEquipment = handler === patchEquipmentStatus;
    const response = isEquipment
      ? await patchEquipmentStatus(
          request("/api/admin/equipment/overlong", JSON.stringify({ status: "OUT_OF_SERVICE", reason: "고장" })),
          { params: Promise.resolve({ assetNumber: identifier }) }
        )
      : await patchUserStatus(
          request("/api/admin/users/overlong", JSON.stringify({ status: "INACTIVE" })),
          { params: Promise.resolve({ employeeNumber: identifier }) }
        );

    expect(response.status).toBe(400);
  });

  it("allows an existing overlong legacy identifier", async () => {
    const assetNumber = "E".repeat(101);
    mocks.equipmentFindUnique.mockResolvedValueOnce({ id: "equipment-overlong", assetNumber });

    const response = await patchEquipmentStatus(
      request("/api/admin/equipment/overlong", JSON.stringify({ status: "OUT_OF_SERVICE", reason: "고장" })),
      { params: Promise.resolve({ assetNumber: `  ${assetNumber.toLowerCase()}  ` }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.equipmentFindUnique).toHaveBeenCalledWith({ where: { assetNumber } });
  });

  it.each([
    [
      "details",
      patchEquipmentDetails,
      "/api/admin/equipment/EQ%2FLEGACY/details",
      { name: "레거시 장비" }
    ],
    [
      "status",
      patchEquipmentStatus,
      "/api/admin/equipment/EQ%2FLEGACY",
      { status: "OUT_OF_SERVICE", reason: "고장" }
    ],
    [
      "reassignment",
      postEquipmentReassign,
      "/api/admin/equipment/EQ%2FLEGACY/reassign",
      { reason: "회수" }
    ]
  ])("allows an existing legacy identifier on equipment %s", async (_name, handler, path, input) => {
    mocks.equipmentFindUnique.mockResolvedValueOnce({ id: "equipment-legacy", assetNumber: "EQ/LEGACY" });

    const response = await handler(
      request(path, JSON.stringify(input)),
      { params: Promise.resolve({ assetNumber: "  eq/legacy  " }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.equipmentFindUnique).toHaveBeenCalledWith({ where: { assetNumber: "EQ/LEGACY" } });
  });
});
