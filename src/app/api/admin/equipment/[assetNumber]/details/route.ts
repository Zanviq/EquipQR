import { z } from "zod";
import { requireRequestUser } from "@/server/auth/current-user";
import { updateEquipmentDetails } from "@/server/admin/equipment";
import { prisma } from "@/server/db/client";
import { DomainError } from "@/server/domain/errors";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";

export async function PATCH(request: Request, context: { params: Promise<{ assetNumber: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireRequestUser(request, "ADMIN");
    const { assetNumber } = await context.params;
    const equipment = await prisma.equipment.findUnique({ where: { assetNumber: assetNumber.toUpperCase() } });
    if (!equipment) throw new DomainError("EQUIPMENT_NOT_FOUND", "장비를 찾을 수 없습니다.", 404);
    const input = z.object({ name: z.string().min(1).max(200), note: z.string().max(1000).optional() }).parse(await request.json());
    await updateEquipmentDetails({ adminUserId: admin.id, equipmentId: equipment.id, ...input });
    return Response.json({ ok: true });
  } catch (error) { return domainErrorResponse(error); }
}
