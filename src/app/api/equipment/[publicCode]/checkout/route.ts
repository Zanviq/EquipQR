import { requireRequestUser } from "@/server/auth/current-user";
import { checkoutEquipment } from "@/server/circulation/checkout";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";

export async function POST(request: Request, context: { params: Promise<{ publicCode: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request);
    const { publicCode } = await context.params;
    await checkoutEquipment({ publicCode, actorUserId: user.id });
    return Response.json({ ok: true, message: "대여했습니다." });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
