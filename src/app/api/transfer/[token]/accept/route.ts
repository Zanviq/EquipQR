import { requireRequestUser } from "@/server/auth/current-user";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";
import { acceptTransferTicket } from "@/server/transfer/accept-ticket";
import { enforceRateLimit, requestIp } from "@/server/http/rate-limit";
import { prisma } from "@/server/db/client";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request);
    enforceRateLimit({ key: `accept:${user.id}:${requestIp(request)}`, limit: 30, windowMs: 60 * 1000 });
    const { token } = await context.params;
    const result = await acceptTransferTicket({ token, recipientUserId: user.id });
    const previous = await prisma.user.findUnique({ where: { id: result.previousAssignment.userId }, select: { name: true } });
    return Response.json({ ok: true, message: "장비를 전달받았습니다.", previousUserName: previous?.name ?? "이전 사용자", nextUserName: user.name, transferMode: result.nextAssignment.transferModeSnapshot });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
