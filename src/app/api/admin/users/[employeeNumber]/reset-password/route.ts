import { z } from "zod";
import { requireRequestUser } from "@/server/auth/current-user";
import { resetUserPassword } from "@/server/admin/users";
import { prisma } from "@/server/db/client";
import { DomainError } from "@/server/domain/errors";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";

export async function POST(request: Request, context: { params: Promise<{ employeeNumber: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireRequestUser(request, "ADMIN");
    const { employeeNumber } = await context.params;
    const target = await prisma.user.findUnique({ where: { employeeNumber: employeeNumber.toUpperCase() } });
    if (!target) throw new DomainError("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.", 404);
    const { password } = z.object({ password: z.string().min(12).max(256) }).parse(await request.json());
    await resetUserPassword({ adminUserId: admin.id, userId: target.id, password });
    return Response.json({ ok: true });
  } catch (error) { return domainErrorResponse(error); }
}
