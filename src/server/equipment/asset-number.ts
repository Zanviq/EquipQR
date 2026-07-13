import { isStrictAssetNumber, uppercaseAscii } from "@/server/http/schemas";

export function normalizeAssetNumber(value: string) {
  const trimmed = value.trim();
  if (!isStrictAssetNumber(trimmed)) throw new Error("INVALID_ASSET_NUMBER");
  return uppercaseAscii(trimmed);
}
