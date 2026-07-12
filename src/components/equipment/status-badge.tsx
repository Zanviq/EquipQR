import type { EffectiveStatus } from "@/server/equipment/effective-status";

const labels: Record<EffectiveStatus, string> = {
  AVAILABLE: "대여 가능",
  CHECKED_OUT: "대여 중",
  TRANSFER_PENDING: "전달 진행 중",
  OUT_OF_SERVICE: "사용 중지"
};

export function StatusBadge({ status }: { status: EffectiveStatus }) {
  return <span className={`status-badge status-${status.toLowerCase().replaceAll("_", "-")}`}>{labels[status]}</span>;
}
