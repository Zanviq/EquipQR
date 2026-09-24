import { prisma } from "@/server/db/client";
import { normalizeEmployeeNumber } from "@/server/auth/employee-number";
import { hashPassword } from "@/server/auth/password";
import { createEquipment } from "@/server/admin/equipment";
import { normalizeAssetNumber } from "@/server/equipment/asset-number";

// 데모 전용 계정. 운영 비밀번호 정책(12자 이상)을 거치지 않도록 직접 생성한다.
export const DEMO_ACCOUNT = { employeeNumber: "demo", name: "데모 관리자", password: "demo1234" } as const;

export const DEMO_EQUIPMENT = [
  { assetNumber: "DEMO-NB-001", name: "노트북 14인치", note: "데모 장비" },
  { assetNumber: "DEMO-NB-002", name: "노트북 16인치", note: "데모 장비" },
  { assetNumber: "DEMO-TAB-001", name: "태블릿", note: "데모 장비" },
  { assetNumber: "DEMO-CAM-001", name: "미러리스 카메라", note: "데모 장비" },
  { assetNumber: "DEMO-PJ-001", name: "휴대용 프로젝터", note: "데모 장비" }
] as const;

export async function seedDemo() {
  const employeeNumber = normalizeEmployeeNumber(DEMO_ACCOUNT.employeeNumber);
  let user = await prisma.user.findUnique({ where: { employeeNumber } });
  const userCreated = !user;
  if (!user) {
    user = await prisma.user.create({ data: {
      employeeNumber,
      name: DEMO_ACCOUNT.name,
      passwordHash: await hashPassword(DEMO_ACCOUNT.password),
      role: "ADMIN"
    } });
  }

  let equipmentCreated = 0;
  for (const item of DEMO_EQUIPMENT) {
    const exists = await prisma.equipment.findUnique({ where: { assetNumber: normalizeAssetNumber(item.assetNumber) } });
    if (exists) continue;
    await createEquipment({ adminUserId: user.id, ...item });
    equipmentCreated += 1;
  }
  return { userCreated, equipmentCreated };
}
