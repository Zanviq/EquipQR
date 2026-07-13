import { z } from "zod";
import { requireRequestUser } from "@/server/auth/current-user";
import { changeResponsibility } from "@/server/admin/equipment";
import { findEquipmentByAssetNumber, findUserByEmployeeNumber } from "@/server/admin/identifier-lookup";
import { DomainError } from "@/server/domain/errors";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";

export async function POST(request: Request, context: { params: Promise<{ assetNumber: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireRequestUser(request, "ADMIN");
    const { assetNumber } = await context.params;
    const equipment = await findEquipmentByAssetNumber(assetNumber);
    if (!equipment) throw new DomainError("EQUIPMENT_NOT_FOUND", "장비를 찾을 수 없습니다.", 404);
    const input = z.object({ nextEmployeeNumber: z.string().nullable().optional(), reason: z.string().min(1).max(500) }).parse(await request.json());
    let nextUserId: string | null = null;
    if (input.nextEmployeeNumber) {
      const user = await findUserByEmployeeNumber(input.nextEmployeeNumber);
      if (!user) throw new DomainError("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.", 404);
      nextUserId = user.id;
    }
    await changeResponsibility({ adminUserId: admin.id, equipmentId: equipment.id, nextUserId, reason: input.reason });
    return Response.json({ ok: true });
  } catch (error) { return domainErrorResponse(error); }
}
