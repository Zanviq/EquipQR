import { notFound } from "next/navigation";
import { AdminForm } from "@/components/admin/admin-form";
import { prisma } from "@/server/db/client";
import { encodePathSegment } from "@/lib/admin-paths";

export default async function AdminUserPage({ params }: { params: Promise<{ employeeNumber: string }> }) {
  const { employeeNumber } = await params;
  const user = await prisma.user.findUnique({ where: { employeeNumber: employeeNumber.toUpperCase() }, include: { assignments: { where: { endedAt: null }, include: { equipment: true } } } });
  if (!user) notFound();
  const employeeSegment = encodePathSegment(user.employeeNumber);
  return <main className="admin-wrap stack" style={{ gap: 28 }}><header><p className="eyebrow font-data">{user.employeeNumber}</p><h1 className="page-title">{user.name}</h1><p className="page-copy">{user.role === "ADMIN" ? "관리자" : "일반 직원"} · {user.status === "ACTIVE" ? "활성" : "비활성"}</p></header>
    <section className="admin-columns"><div className="card admin-panel stack"><h2 className="section-title">계정 상태</h2><AdminForm endpoint={`/api/admin/users/${employeeSegment}`} method="PATCH" submitLabel={user.status === "ACTIVE" ? "계정 비활성화" : "계정 활성화"} confirmMessage="계정 상태를 변경하시겠습니까?"><input type="hidden" name="status" value={user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"} /><p className="page-copy">비활성화하면 모든 로그인 세션이 종료되며 보유 장비 책임은 유지됩니다.</p></AdminForm></div>
    <div className="card admin-panel stack"><h2 className="section-title">비밀번호 초기화</h2><AdminForm endpoint={`/api/admin/users/${employeeSegment}/reset-password`} submitLabel="비밀번호 초기화" confirmMessage="새 비밀번호로 초기화하시겠습니까?"><label className="field"><span>새 비밀번호 (12자 이상)</span><input className="input" name="password" type="password" minLength={12} required /></label></AdminForm></div></section>
    <section className="stack"><h2 className="section-title">현재 보유 장비</h2><div className="card">{user.assignments.length ? user.assignments.map(a => <div className="loan-row" key={a.id}><div><strong>{a.equipment.name}</strong><span className="font-data">{a.equipment.assetNumber}</span></div><span>{a.startedAt.toLocaleDateString("ko-KR")}부터</span></div>) : <div className="empty-state">보유 중인 장비가 없습니다.</div>}</div></section>
  </main>;
}
