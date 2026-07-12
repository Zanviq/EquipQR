export function normalizeEmployeeNumber(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!normalized) throw new Error("INVALID_EMPLOYEE_NUMBER");
  return normalized;
}
