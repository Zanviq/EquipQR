import { z } from "zod";
import { requireRequestUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";

const schema = z.object({ scanActionMode: z.enum(["IMMEDIATE", "CONFIRM"]) });

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRequestUser(request);
    const input = schema.parse(await request.json());
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { scanActionMode: input.scanActionMode },
      select: { scanActionMode: true }
    });
    return Response.json(updated);
  } catch (error) {
    return domainErrorResponse(error);
  }
}
