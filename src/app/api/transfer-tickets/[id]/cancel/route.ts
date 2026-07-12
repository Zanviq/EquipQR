import { requireRequestUser } from "@/server/auth/current-user";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";
import { cancelTransferTicket } from "@/server/transfer/cancel-ticket";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request);
    const { id } = await context.params;
    await cancelTransferTicket({ ticketId: id, actorUserId: user.id });
    return Response.json({ ok: true, message: "전달 QR을 취소했습니다." });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
