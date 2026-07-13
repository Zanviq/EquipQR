import { z } from "zod";
import { requireRequestUser } from "@/server/auth/current-user";
import { setEquipmentStatus } from "@/server/admin/equipment";
import { findEquipmentByAssetNumber } from "@/server/admin/identifier-lookup";
import { DomainError } from "@/server/domain/errors";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";

export async function PATCH(request: Request, context: { params: Promise<{ assetNumber: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireRequestUser(request, "ADMIN");
    const { assetNumber } = await context.params;
    const equipment = await findEquipmentByAssetNumber(assetNumber);
    if (!equipment) throw new DomainError("EQUIPMENT_NOT_FOUND", "장비를 찾을 수 없습니다.", 404);
    const input = z.object({ status: z.enum(["ACTIVE", "OUT_OF_SERVICE"]), reason: z.string().min(1).max(500) }).parse(await request.json());
    await setEquipmentStatus({ adminUserId: admin.id, equipmentId: equipment.id, ...input });
    return Response.json({ ok: true });
  } catch (error) { return domainErrorResponse(error); }
}
