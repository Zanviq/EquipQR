import { requireRequestUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { DomainError } from "@/server/domain/errors";
import { domainErrorResponse } from "@/server/http/response";

export async function GET(request: Request, context: { params: Promise<{ assetNumber: string }> }) {
  try {
    await requireRequestUser(request);
    const { assetNumber } = await context.params;
    const equipment = await prisma.equipment.findUnique({ where: { assetNumber: assetNumber.trim().toUpperCase() }, select: { publicCode: true, retiredAt: true } });
    if (!equipment || equipment.retiredAt) throw new DomainError("EQUIPMENT_NOT_FOUND", "장비를 찾을 수 없습니다.", 404);
    return Response.json({ publicCode: equipment.publicCode });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
