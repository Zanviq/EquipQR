import { prisma } from "@/server/db/client";
import { DomainError } from "@/server/domain/errors";
import { isStrictAssetNumber, isStrictEmployeeNumber, uppercaseAscii } from "@/server/http/schemas";

async function findLegacyCompatibleIdentifier<T>(
  value: string,
  isStrict: (trimmed: string) => boolean,
  findUnique: (normalized: string) => Promise<T | null>
) {
  const trimmed = value.trim();
  const normalized = uppercaseAscii(trimmed);
  const existing = await findUnique(normalized);
  if (existing) return existing;
  if (!isStrict(trimmed)) {
    throw new DomainError("INVALID_IDENTIFIER", "식별자 형식을 확인해 주세요.", 400);
  }
  return null;
}

export function findEquipmentByAssetNumber(value: string) {
  return findLegacyCompatibleIdentifier(value, isStrictAssetNumber, (assetNumber) =>
    prisma.equipment.findUnique({ where: { assetNumber } })
  );
}

export function findUserByEmployeeNumber(value: string) {
  return findLegacyCompatibleIdentifier(value, isStrictEmployeeNumber, (employeeNumber) =>
    prisma.user.findUnique({ where: { employeeNumber } })
  );
}
