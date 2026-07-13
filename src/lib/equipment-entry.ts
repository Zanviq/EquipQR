import type { ScanActionMode } from "@/generated/prisma/enums";

export function equipmentWorkPath(publicCode: string) {
  return `/scan/equipment/${encodeURIComponent(publicCode)}?manual=1`;
}

export function scanActionModeForEntry(preferred: ScanActionMode, manual: string | undefined): ScanActionMode {
  return manual === "1" ? "CONFIRM" : preferred;
}
