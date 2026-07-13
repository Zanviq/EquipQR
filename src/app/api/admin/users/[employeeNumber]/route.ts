import { z } from "zod";
import { requireRequestUser } from "@/server/auth/current-user";
import { setUserStatus } from "@/server/admin/users";
import { findUserByEmployeeNumber } from "@/server/admin/identifier-lookup";
import { DomainError } from "@/server/domain/errors";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";

const schema = z.object({ status: z.enum(["ACTIVE", "INACTIVE"]) });

export async function PATCH(request: Request, context: { params: Promise<{ employeeNumber: string }> }) {
  try {
    assertSameOrigin(request);
    const admin = await requireRequestUser(request, "ADMIN");
    const { employeeNumber } = await context.params;
    const target = await findUserByEmployeeNumber(employeeNumber);
    if (!target) throw new DomainError("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.", 404);
    const input = schema.parse(await request.json());
    await setUserStatus({ adminUserId: admin.id, userId: target.id, status: input.status });
    return Response.json({ ok: true });
  } catch (error) { return domainErrorResponse(error); }
}
