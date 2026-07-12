import Link from "next/link";
import { getDashboard } from "@/server/admin/dashboard";

const eventLabels: Record<string, string> = { CHECKOUT: "대여", RETURN: "반납", TRANSFER: "전달", ADMIN_REASSIGN: "관리자 재배정", ADMIN_RECALL: "관리자 회수", STATUS_CHANGED: "상태 변경", EQUIPMENT_CREATED: "장비 등록", USER_CREATED: "사용자 등록", USER_UPDATED: "사용자 변경", PASSWORD_RESET: "비밀번호 초기화", TRANSFER_TICKET_CREATED: "전달 QR 생성", TRANSFER_TICKET_CANCELLED: "전달 QR 취소" };

export default async function AdminDashboardPage() {
  const data = await getDashboard();
  const metrics = [["전체 장비", data.counts.total], ["대여 중", data.counts.checkedOut], ["대여 가능", data.counts.available], ["사용 중지", data.counts.outOfService]];
  return <main className="admin-wrap stack" style={{ gap: 28 }}>
    <header><p className="eyebrow">Operations</p><h1 className="page-title">운영 현황</h1><p className="page-copy">장비 상태와 최근 책임 변경을 한눈에 확인합니다.</p></header>
    <section className="metric-grid" aria-label="장비 지표">{metrics.map(([label, value]) => <div className="card metric-card" key={label}><span>{label}</span><div className="metric-value">{value}</div></div>)}</section>
    <div className="admin-columns">
      <section className="stack"><div className="row-between"><h2 className="section-title">최근 이벤트</h2><Link className="text-link" href="/admin/history">전체 기록</Link></div><div className="card timeline">{data.recentEvents.length ? data.recentEvents.map(event => <article key={event.id}><span className="timeline-dot"/><div><strong>{eventLabels[event.eventType] ?? event.eventType}</strong><p>{event.equipment?.name ?? event.nextUser?.name ?? "시스템 변경"} · {event.actorUser?.name ?? "시스템"}</p></div><time>{event.occurredAt.toLocaleString("ko-KR")}</time></article>) : <div className="empty-state">아직 기록이 없습니다.</div>}</div></section>
      <section className="stack"><h2 className="section-title">30일 이상 대여</h2><div className="card">{data.longLoans.length ? data.longLoans.map(item => <Link className="loan-row" key={item.id} href={`/admin/equipment/${item.equipment.assetNumber}`}><div><strong>{item.equipment.name}</strong><span className="font-data">{item.equipment.assetNumber}</span></div><span>{item.user.name}</span></Link>) : <div className="empty-state">장기 대여 장비가 없습니다.</div>}</div></section>
    </div>
    <section className="stack"><h2 className="section-title">사용자별 보유 현황</h2><div className="card">{data.userHoldings.length ? data.userHoldings.map(user => <Link className="loan-row" key={user.id} href={`/admin/users/${user.employeeNumber}`}><div><strong>{user.name}</strong><span className="font-data">{user.employeeNumber}</span></div><span>{user._count.assignments}대{user.status === "INACTIVE" ? " · 조치 필요" : ""}</span></Link>) : <div className="empty-state">장비를 보유한 사용자가 없습니다.</div>}</div></section>
  </main>;
}
