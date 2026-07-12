import { randomBytes } from "node:crypto";

export function createPublicCode() {
  return randomBytes(24).toString("base64url");
}

export function buildEquipmentQrUrl(origin: string, publicCode: string) {
  return new URL(`/scan/equipment/${encodeURIComponent(publicCode)}`, origin);
}
