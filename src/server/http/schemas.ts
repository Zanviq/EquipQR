import { z } from "zod";

const ASCII_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
export const EMPLOYEE_NUMBER_MAX_LENGTH = 64;
export const ASSET_NUMBER_MAX_LENGTH = 100;

export function uppercaseAscii(value: string) {
  return value.replace(/[a-z]/g, (character) => character.toUpperCase());
}

function isStrictIdentifier(value: string, maxLength: number) {
  return value.length > 0
    && value.length <= maxLength
    && ASCII_IDENTIFIER_PATTERN.test(value);
}

export function isStrictEmployeeNumber(value: string) {
  return isStrictIdentifier(value, EMPLOYEE_NUMBER_MAX_LENGTH);
}

export function isStrictAssetNumber(value: string) {
  return isStrictIdentifier(value, ASSET_NUMBER_MAX_LENGTH);
}

function normalizedIdentifierSchema(isStrict: (value: string) => boolean) {
  return z.string()
    .trim()
    .refine(isStrict)
    .transform(uppercaseAscii);
}

export const employeeNumberSchema = normalizedIdentifierSchema(isStrictEmployeeNumber);
export const assetNumberSchema = normalizedIdentifierSchema(isStrictAssetNumber);

export function requiredNameSchema(maxLength: number) {
  return z.string().trim().min(1).max(maxLength);
}
