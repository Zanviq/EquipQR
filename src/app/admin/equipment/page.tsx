import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { StatusBadge } from "@/components/equipment/status-badge";
import { prisma } from "@/server/db/client";
import { getEffectiveStatus } from "@/server/equipment/effective-status";
import { adminEquipmentPath } from "@/lib/admin-paths";

export default async function AdminEquipmentPage() {
  const now = new Date();
  const equipment = await prisma.equipment.findMany({ where: { retiredAt: null }, orderBy: { createdAt: "desc" }, include: { assignments: { where: { endedAt: null }, take: 1, include: { user: true } }, transferTickets: { where: { usedAt: null, cancelledAt: null, expiresAt: { gt: now } }, take: 1 } } });
  return <main className="admin-wrap stack" style={{ gap: 28 }}><header><p className="eyebrow">Inventory</p><h1 className="page-title">장비 관리</h1><p className="page-copy">고유 QR이 연결된 사내 장비와 현재 책임자를 관리합니다.</p></header>
    <details className="card admin-panel"><summary>새 장비 등록</summary><AdminForm endpoint="/api/admin/equipment" submitLabel="장비 등록"><div className="admin-form-grid"><label className="field"><span>자산번호</span><input className="input" name="assetNumber" required /></label><label className="field"><span>장비명</span><input className="input" name="name" required /></label></div><label className="field"><span>비고</span><textarea className="textarea" name="note" /></label></AdminForm></details>
    <section className="data-table-wrap"><table className="data-table"><thead><tr><th>자산번호</th><th>장비명</th><th>상태</th><th>현재 사용자</th><th>작업</th></tr></thead><tbody>{equipment.map(item => { const status = getEffectiveStatus({ operationalStatus: item.operationalStatus, hasActiveAssignment: !!item.assignments.length, hasValidTicket: !!item.transferTickets.length }); return <tr key={item.id}><td className="font-data">{item.assetNumber}</td><td>{item.name}</td><td><StatusBadge status={status}/></td><td>{item.assignments[0]?.user.name ?? "—"}</td><td><Link className="text-link" href={adminEquipmentPath(item.assetNumber)}>관리·QR</Link></td></tr>; })}</tbody></table></section>
  </main>;
}
