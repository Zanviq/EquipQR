export type EffectiveStatus = "AVAILABLE" | "CHECKED_OUT" | "TRANSFER_PENDING" | "OUT_OF_SERVICE";

export interface EffectiveStatusInput {
  operationalStatus: "ACTIVE" | "OUT_OF_SERVICE";
  hasActiveAssignment: boolean;
  hasValidTicket: boolean;
}

export function getEffectiveStatus(input: EffectiveStatusInput): EffectiveStatus {
  if (input.operationalStatus === "OUT_OF_SERVICE") return "OUT_OF_SERVICE";
  if (input.hasActiveAssignment && input.hasValidTicket) return "TRANSFER_PENDING";
  if (input.hasActiveAssignment) return "CHECKED_OUT";
  return "AVAILABLE";
}
