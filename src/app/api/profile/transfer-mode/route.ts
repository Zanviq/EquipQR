import { z } from "zod";
import { requireRequestUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";

const schema = z.object({ transferMode: z.enum(["TRANSFER_QR", "INSTANT_EQUIPMENT_QR"]) });

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request);
    const input = schema.parse(await request.json());
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { defaultTransferMode: input.transferMode },
      select: { defaultTransferMode: true }
    });
    return Response.json(updated);
  } catch (error) {
    return domainErrorResponse(error);
  }
}
