import { z } from "zod";
import { requireRequestUser } from "@/server/auth/current-user";
import { createUser } from "@/server/admin/users";
import { assertSameOrigin, domainErrorResponse } from "@/server/http/response";

const schema = z.object({
  employeeNumber: z.string().min(1).max(64),
  name: z.string().min(1).max(100),
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
