import { requireRequestUser } from "@/server/auth/current-user";
import { instantTransfer } from "@/server/transfer/instant-transfer";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";

export async function POST(request: Request, context: { params: Promise<{ publicCode: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request);
    const { publicCode } = await context.params;
    await instantTransfer({ publicCode, recipientUserId: user.id });
    return Response.json({ ok: true, message: "전달이 완료되었습니다." });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
