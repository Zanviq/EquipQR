import { z } from "zod";
import { requireRequestUser } from "@/server/auth/current-user";
import { createEquipment } from "@/server/admin/equipment";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";
import { assetNumberSchema, requiredNameSchema } from "@/server/http/schemas";

const schema = z.object({
  assetNumber: assetNumberSchema,
  name: requiredNameSchema(200),
  note: z.string().max(1000).optional()
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireRequestUser(request, "ADMIN");
    const equipment = await createEquipment({ adminUserId: admin.id, ...schema.parse(await request.json()) });
    return Response.json({ assetNumber: equipment.assetNumber }, { status: 201 });
  } catch (error) { return domainErrorResponse(error); }
}
