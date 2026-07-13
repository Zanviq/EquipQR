import { notFound } from "next/navigation";
import { EquipmentActions } from "@/components/equipment/equipment-actions";
import { EquipmentPassport } from "@/components/equipment/equipment-passport";
import { getCurrentUser } from "@/server/auth/current-user";
import { DomainError } from "@/server/domain/errors";
import { resolveEquipment } from "@/server/equipment/resolve-equipment";

export default async function EquipmentScanPage({ params }: { params: Promise<{ publicCode: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { publicCode } = await params;
  let result;
  try {
    result = await resolveEquipment(publicCode, user.id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "EQUIPMENT_NOT_FOUND") notFound();
    throw error;
  }
  const meta = result.holder ? `현재 사용자: ${result.holder.name}` : "지금 대여할 수 있습니다.";
  return (
    <main className="page-wrap stack" style={{ gap: 24 }}>
      <header><div className="eyebrow">Equipment found</div><h1 className="page-title">장비 상태를 확인하세요.</h1></header>
      <EquipmentPassport name={result.equipment.name} assetNumber={result.equipment.assetNumber} status={result.status} meta={meta} />
      {result.allowedActions.length ? <EquipmentActions publicCode={publicCode} actions={result.allowedActions} scanActionMode={user.scanActionMode} /> : <div className="notice notice-error">현재 사용자가 전달 QR을 만들어야 인수할 수 있습니다.</div>}
    </main>
  );
}
