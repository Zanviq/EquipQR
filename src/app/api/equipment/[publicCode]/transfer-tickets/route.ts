import { requireRequestUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { DomainError } from "@/server/domain/errors";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";
import { issueTransferTicket } from "@/server/transfer/issue-ticket";

export async function POST(request: Request, context: { params: Promise<{ publicCode: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request);
    const { publicCode } = await context.params;
    const equipment = await prisma.equipment.findUnique({ where: { publicCode }, select: { id: true } });
    if (!equipment) throw new DomainError("EQUIPMENT_NOT_FOUND", "장비를 찾을 수 없습니다.", 404);
    const issued = await issueTransferTicket({ equipmentId: equipment.id, actorUserId: user.id });
    return Response.json(issued);
  } catch (error) {
    return domainErrorResponse(error);
  }
}
