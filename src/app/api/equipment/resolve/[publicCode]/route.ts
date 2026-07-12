import { requireRequestUser } from "@/server/auth/current-user";
import { resolveEquipment } from "@/server/equipment/resolve-equipment";
import { domainErrorResponse } from "@/server/http/response";

export async function GET(request: Request, context: { params: Promise<{ publicCode: string }> }) {
  try {
    const user = await requireRequestUser(request);
    const { publicCode } = await context.params;
    return Response.json(await resolveEquipment(publicCode, user.id));
  } catch (error) {
    return domainErrorResponse(error);
  }
}
