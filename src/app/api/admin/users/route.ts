import { z } from "zod";
import { requireRequestUser } from "@/server/auth/current-user";
import { createUser } from "@/server/admin/users";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";
import { employeeNumberSchema, requiredNameSchema } from "@/server/http/schemas";

const schema = z.object({
  employeeNumber: employeeNumberSchema,
  name: requiredNameSchema(100),
  password: z.string().min(12).max(256),
  role: z.enum(["EMPLOYEE", "ADMIN"]).default("EMPLOYEE")
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireRequestUser(request, "ADMIN");
    const input = schema.parse(await request.json());
    const user = await createUser({ adminUserId: admin.id, ...input });
    return Response.json({ id: user.id, employeeNumber: user.employeeNumber }, { status: 201 });
  } catch (error) { return domainErrorResponse(error); }
}
