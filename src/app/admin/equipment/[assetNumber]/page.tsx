import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { AdminForm } from "@/components/admin/admin-form";
import { PrintButton } from "@/components/admin/print-button";
import { StatusBadge } from "@/components/equipment/status-badge";
import { prisma } from "@/server/db/client";
import { getEffectiveStatus } from "@/server/equipment/effective-status";
import { buildEquipmentQrUrl } from "@/server/equipment/public-code";

export default async function AdminEquipmentDetail({ params }: { params: Promise<{ assetNumber: string }> }) {
  const { assetNumber } = await params; const now = new Date();
  const item = await prisma.equipment.findUnique({ where: { assetNumber: assetNumber.toUpperCase() }, include: { assignments: { where: { endedAt: null }, take: 1, include: { user: true } }, transferTickets: { where: { usedAt: null, cancelledAt: null, expiresAt: { gt: now } }, take: 1 }, auditEvents: { take: 20, orderBy: { occurredAt: "desc" }, include: { actorUser: true, previousUser: true, nextUser: true } } } });
  if (!item) notFound();
  const assignment = item.assignments[0];
  const status = getEffectiveStatus({ operationalStatus: item.operationalStatus, hasActiveAssignment: !!assignment, hasValidTicket: !!item.transferTickets.length });
  const qrUrl = buildEquipmentQrUrl(process.env.APP_ORIGIN ?? "http://localhost:3000", item.publicCode).toString();
  const qr = await QRCode.toDataURL(qrUrl, { width: 560, margin: 4, errorCorrectionLevel: "M" });
  return <main className="admin-wrap stack" style={{ gap: 28 }}><header className="row-between admin-title-row"><div><p className="eyebrow font-data">{item.assetNumber}</p><h1 className="page-title">{item.name}</h1><StatusBadge status={status}/></div><PrintButton /></header>
    <section className="admin-columns"><div className="card qr-label">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt={`${item.name} 장비 QR 코드`} width={280} height={280}/><strong>{item.name}</strong><span className="font-data">{item.assetNumber}</span><small>EquipQR · 스캔하여 대여/반납/전달</small></div>
    <div className="stack print-hidden"><div className="card admin-panel stack"><h2 className="section-title">장비 정보</h2><AdminForm endpoint={`/api/admin/equipment/${item.assetNumber}/details`} method="PATCH" submitLabel="정보 저장"><label className="field"><span>장비명</span><input className="input" name="name" defaultValue={item.name} required /></label><label className="field"><span>비고</span><textarea className="textarea" name="note" defaultValue={item.note ?? ""} /></label></AdminForm></div>
    <div className="card admin-panel stack"><h2 className="section-title">운영 상태</h2><AdminForm endpoint={`/api/admin/equipment/${item.assetNumber}`} method="PATCH" submitLabel={item.operationalStatus === "ACTIVE" ? "사용 중지" : "사용 재개"} confirmMessage="장비 운영 상태를 변경하시겠습니까?"><input type="hidden" name="status" value={item.operationalStatus === "ACTIVE" ? "OUT_OF_SERVICE" : "ACTIVE"} /><label className="field"><span>변경 사유</span><textarea className="textarea" name="reason" required /></label></AdminForm></div>
    <div className="card admin-panel stack"><h2 className="section-title">책임자 강제 변경</h2><p className="page-copy">현재 책임자: {assignment?.user.name ?? "없음"}</p><AdminForm endpoint={`/api/admin/equipment/${item.assetNumber}/reassign`} submitLabel="책임자 변경" confirmMessage="감사 기록을 남기고 책임자를 변경하시겠습니까?" nullFields={["nextEmployeeNumber"]}><label className="field"><span>새 책임자 사번 (비우면 회수)</span><input className="input" name="nextEmployeeNumber" /></label><label className="field"><span>변경 사유</span><textarea className="textarea" name="reason" required /></label></AdminForm></div></div></section>
    <section className="stack print-hidden"><h2 className="section-title">최근 변경 기록</h2><div className="card timeline">{item.auditEvents.map(event => <article key={event.id}><span className="timeline-dot"/><div><strong>{event.eventType}</strong><p>{event.previousUser?.name ?? "없음"} → {event.nextUser?.name ?? "없음"}{event.reason ? ` · ${event.reason}` : ""}</p></div><time>{event.occurredAt.toLocaleString("ko-KR")}</time></article>)}</div></section>
  </main>;
}
