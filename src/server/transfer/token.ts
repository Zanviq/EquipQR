import { createHash, randomBytes } from "node:crypto";

export const TRANSFER_TTL_MS = 10 * 60 * 1000;

export function createTransferToken() {
  return randomBytes(32).toString("base64url");
}

export function hashTransferToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
