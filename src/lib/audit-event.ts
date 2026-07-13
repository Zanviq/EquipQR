export const auditEventLabels: Record<string, string> = {
  CHECKOUT: "대여",
  RETURN: "반납",
  TRANSFER: "전달",
  TRANSFER_TICKET_CREATED: "전달 QR 생성",
  TRANSFER_TICKET_CANCELLED: "전달 QR 취소",
  EQUIPMENT_CREATED: "장비 등록",
  EQUIPMENT_UPDATED: "장비 수정",
  ADMIN_REASSIGN: "관리자 재배정",
  ADMIN_RECALL: "관리자 회수",
  STATUS_CHANGED: "상태 변경",
  USER_CREATED: "사용자 등록",
  USER_UPDATED: "사용자 변경",
  PASSWORD_RESET: "비밀번호 초기화"
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "없음";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function operationalStatusLabel(value: unknown) {
  if (value === "ACTIVE") return "사용 가능";
  if (value === "OUT_OF_SERVICE") return "사용 중지";
  return displayValue(value);
}

function userStatusLabel(value: unknown) {
  if (value === "ACTIVE") return "활성";
  if (value === "INACTIVE") return "비활성";
  return displayValue(value);
}

export function describeAuditMetadata(eventType: string, metadata: unknown): string[] {
  if (!isRecord(metadata)) return [];
  const before = isRecord(metadata.before) ? metadata.before : undefined;
  const after = isRecord(metadata.after) ? metadata.after : undefined;

  if (eventType === "EQUIPMENT_UPDATED" && before && after) {
    return [
      `장비명: ${displayValue(before.name)} → ${displayValue(after.name)}`,
      `비고: ${displayValue(before.note)} → ${displayValue(after.note)}`
    ];
  }

  if (eventType === "STATUS_CHANGED") {
    if (before && after) return [`운영 상태: ${operationalStatusLabel(before.status)} → ${operationalStatusLabel(after.status)}`];
    if ("status" in metadata) return [`운영 상태: ${operationalStatusLabel(metadata.status)}`];
  }

  if (eventType === "USER_UPDATED") {
    if (before && after) return [`계정 상태: ${userStatusLabel(before.status)} → ${userStatusLabel(after.status)}`];
    if ("status" in metadata) return [`계정 상태: ${userStatusLabel(metadata.status)}`];
  }

  return Object.entries(metadata).map(([key, value]) => `${key}: ${displayValue(value)}`);
}
