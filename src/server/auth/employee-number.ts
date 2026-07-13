import { isStrictEmployeeNumber, uppercaseAscii } from "@/server/http/schemas";

export function normalizeEmployeeNumber(value: string) {
  const trimmed = value.trim();
  if (!isStrictEmployeeNumber(trimmed)) throw new Error("INVALID_EMPLOYEE_NUMBER");
  return uppercaseAscii(trimmed);
}
