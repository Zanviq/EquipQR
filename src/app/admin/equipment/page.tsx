import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { EquipmentPrintSelection } from "@/components/admin/equipment-print-selection";
import { prisma } from "@/server/db/client";
import { getEffectiveStatus } from "@/server/equipment/effective-status";
import { adminEquipmentPath } from "@/lib/admin-paths";

const PAGE_SIZE = 50;

function equipmentPageHref(q: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("page", String(page));
  return `/admin/equipment?${params.toString()}`;
}

export default async function AdminEquipmentPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const search = await searchParams;
  const q = search.q?.trim() ?? "";
  const parsedPage = Number.parseInt(search.page ?? "1", 10);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const now = new Date();
  const results = await prisma.equipment.findMany({
    where: {
      retiredAt: null,
      ...(q ? { OR: [
        { assetNumber: { contains: q, mode: "insensitive" as const } },
        { name: { contains: q, mode: "insensitive" as const } },
        { note: { contains: q, mode: "insensitive" as const } }
      ] } : {})
    },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      assignments: { where: { endedAt: null }, take: 1, include: { user: true } },
      transferTickets: { where: { usedAt: null, cancelledAt: null, expiresAt: { gt: now } }, take: 1 }
    }
  });
  const hasNextPage = results.length > PAGE_SIZE;
  const equipment = results.slice(0, PAGE_SIZE);
  const printItems = equipment.map((item) => ({
    id: item.id,
    assetNumber: item.assetNumber,
    name: item.name,
    status: getEffectiveStatus({ operationalStatus: item.operationalStatus, hasActiveAssignment: !!item.assignments.length, hasValidTicket: !!item.transferTickets.length }),
    currentUser: item.assignments[0]?.user.name ?? null,
    manageHref: adminEquipmentPath(item.assetNumber)
  }));

  return <main className="admin-wrap stack" style={{ gap: 28 }}>
    <header><p className="eyebrow">Inventory</p><h1 className="page-title">장비 관리</h1><p className="page-copy">고유 QR이 연결된 사내 장비와 현재 책임자를 관리합니다.</p></header>
    <details className="card admin-panel"><summary>새 장비 등록</summary><AdminForm endpoint="/api/admin/equipment" submitLabel="장비 등록"><div className="admin-form-grid"><label className="field"><span>자산번호</span><input className="input" name="assetNumber" required /></label><label className="field"><span>장비명</span><input className="input" name="name" required /></label></div><label className="field"><span>비고</span><textarea className="textarea" name="note" /></label></AdminForm></details>
    <form className="row" role="search"><input className="input" name="q" defaultValue={q} placeholder="장비명, 자산번호, 비고" aria-label="장비 검색"/><button className="button button-secondary">검색</button></form>
    <EquipmentPrintSelection items={printItems}/>
    <nav className="row-between" aria-label="장비 목록 페이지">
      {page > 1 ? <Link className="button button-secondary" href={equipmentPageHref(q, page - 1)}>이전</Link> : <span/>}
      <span className="page-copy">{page}페이지</span>
      {hasNextPage ? <Link className="button button-secondary" href={equipmentPageHref(q, page + 1)}>다음</Link> : <span/>}
    </nav>
  </main>;
}
