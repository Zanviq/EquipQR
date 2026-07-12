import { requireRequestUser } from "@/server/auth/current-user";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";
import { acceptTransferTicket } from "@/server/transfer/accept-ticket";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request);
    const { token } = await context.params;
    await acceptTransferTicket({ token, recipientUserId: user.id });
    return Response.json({ ok: true, message: "장비를 전달받았습니다." });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
