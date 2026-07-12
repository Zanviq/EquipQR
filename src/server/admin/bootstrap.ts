import { prisma } from "@/server/db/client";
import { normalizeEmployeeNumber } from "@/server/auth/employee-number";
import { hashPassword } from "@/server/auth/password";

export interface BootstrapAdminInput {
  employeeNumber: string;
  name: string;
  password: string;
}

export async function bootstrapAdmin(input: BootstrapAdminInput) {
  if (input.password.length < 12) throw new Error("WEAK_PASSWORD");
  const employeeNumber = normalizeEmployeeNumber(input.employeeNumber);
  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    if (await tx.user.count({ where: { role: "ADMIN" } })) {
      throw new Error("INITIAL_ADMIN_ALREADY_EXISTS");
    }
    return tx.user.create({
      data: { employeeNumber, name: input.name.trim(), passwordHash, role: "ADMIN" }
    });
  }, { isolationLevel: "Serializable" });
}
