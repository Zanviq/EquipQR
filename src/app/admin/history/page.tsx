import Link from "next/link";
import { auditEventLabels, describeAuditMetadata } from "@/lib/audit-event";
import { prisma } from "@/server/db/client";

const PAGE_SIZE = 50;

function historyPageHref(q: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("page", String(page));
  return `/admin/history?${params.toString()}`;
}

export default async function AdminHistoryPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const search = await searchParams;
  const q = search.q?.trim() ?? "";
  const parsedPage = Number.parseInt(search.page ?? "1", 10);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const results = await prisma.auditEvent.findMany({
    where: q ? { OR: [
      { equipment: { assetNumber: { contains: q, mode: "insensitive" } } },
      { equipment: { name: { contains: q, mode: "insensitive" } } },
      { actorUser: { name: { contains: q, mode: "insensitive" } } },
      { actorUser: { employeeNumber: { contains: q, mode: "insensitive" } } },
      { previousUser: { name: { contains: q, mode: "insensitive" } } },
      { previousUser: { employeeNumber: { contains: q, mode: "insensitive" } } },
      { nextUser: { name: { contains: q, mode: "insensitive" } } },
      { nextUser: { employeeNumber: { contains: q, mode: "insensitive" } } }
    ] } : undefined,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    include: { equipment: true, actorUser: true, previousUser: true, nextUser: true }
  });
  const hasNextPage = results.length > PAGE_SIZE;
  const events = results.slice(0, PAGE_SIZE);

  return <main className="admin-wrap stack" style={{ gap: 28 }}>
    <header><p className="eyebrow">Audit trail</p><h1 className="page-title">이용 기록</h1><p className="page-copy">대여·반납·전달과 관리자 변경 이력을 삭제 없이 추적합니다.</p></header>
    <form className="row" role="search"><input className="input" name="q" defaultValue={q} placeholder="장비명, 자산번호, 처리자 이름" aria-label="기록 검색"/><button className="button button-secondary">검색</button></form>
    <section className="data-table-wrap">
      <table className="data-table"><thead><tr><th>처리 시각</th><th>유형</th><th>장비</th><th>책임 변경</th><th>처리자</th><th>변경 내용</th><th>사유</th></tr></thead><tbody>{events.map(event => {
        const metadata = describeAuditMetadata(event.eventType, event.metadata);
        return <tr key={event.id}><td>{event.occurredAt.toLocaleString("ko-KR")}</td><td>{auditEventLabels[event.eventType] ?? event.eventType}</td><td>{event.equipment ? <><strong>{event.equipment.name}</strong><br/><span className="font-data">{event.equipment.assetNumber}</span></> : "—"}</td><td>{event.previousUser?.name ?? "—"} → {event.nextUser?.name ?? "—"}</td><td>{event.actorUser?.name ?? "시스템"}</td><td>{metadata.length ? metadata.map(item => <div key={item}>{item}</div>) : "—"}</td><td>{event.reason ?? "—"}</td></tr>;
      })}</tbody></table>
      {events.length === 0 ? <div className="empty-state">조건에 맞는 기록이 없습니다.</div> : null}
    </section>
    <nav className="row-between" aria-label="이용 기록 페이지">
      {page > 1 ? <Link className="button button-secondary" href={historyPageHref(q, page - 1)}>이전</Link> : <span/>}
      <span className="page-copy">{page}페이지</span>
      {hasNextPage ? <Link className="button button-secondary" href={historyPageHref(q, page + 1)}>다음</Link> : <span/>}
    </nav>
  </main>;
}
