import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { prisma } from "@/server/db/client";
import { adminUserPath } from "@/lib/admin-paths";

const PAGE_SIZE = 50;

function usersPageHref(q: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("page", String(page));
  return `/admin/users?${params.toString()}`;
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const search = await searchParams;
  const q = search.q?.trim() ?? "";
  const parsedPage = Number.parseInt(search.page ?? "1", 10);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const results = await prisma.user.findMany({
    where: q ? { OR: [
      { employeeNumber: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } }
    ] } : undefined,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { _count: { select: { assignments: { where: { endedAt: null } } } } }
  });
  const hasNextPage = results.length > PAGE_SIZE;
  const users = results.slice(0, PAGE_SIZE);

  return <main className="admin-wrap stack" style={{ gap: 28 }}>
    <header><p className="eyebrow">People</p><h1 className="page-title">사용자 관리</h1><p className="page-copy">계정을 등록하고 활성 상태와 보유 장비를 관리합니다.</p></header>
    <details className="card admin-panel"><summary>새 사용자 등록</summary><AdminForm endpoint="/api/admin/users" submitLabel="사용자 등록"><div className="admin-form-grid"><label className="field"><span>사번</span><input className="input" name="employeeNumber" required /></label><label className="field"><span>이름</span><input className="input" name="name" required /></label><label className="field"><span>초기 비밀번호</span><input className="input" name="password" type="password" minLength={12} required /></label><label className="field"><span>권한</span><select className="select" name="role"><option value="EMPLOYEE">일반 직원</option><option value="ADMIN">관리자</option></select></label></div></AdminForm></details>
    <form className="row" role="search"><input className="input" name="q" defaultValue={q} placeholder="이름, 사번" aria-label="사용자 검색"/><button className="button button-secondary">검색</button></form>
    <section className="data-table-wrap"><table className="data-table"><thead><tr><th>사번</th><th>이름</th><th>권한</th><th>상태</th><th>보유</th><th>작업</th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td className="font-data">{user.employeeNumber}</td><td>{user.name}</td><td>{user.role === "ADMIN" ? "관리자" : "직원"}</td><td>{user.status === "ACTIVE" ? "활성" : "비활성"}</td><td>{user._count.assignments}대</td><td><Link className="text-link" href={adminUserPath(user.employeeNumber)}>관리</Link></td></tr>)}</tbody></table>{users.length === 0 ? <div className="empty-state">조건에 맞는 사용자가 없습니다.</div> : null}</section>
    <nav className="row-between" aria-label="사용자 목록 페이지">
      {page > 1 ? <Link className="button button-secondary" href={usersPageHref(q, page - 1)}>이전</Link> : <span/>}
      <span className="page-copy">{page}페이지</span>
      {hasNextPage ? <Link className="button button-secondary" href={usersPageHref(q, page + 1)}>다음</Link> : <span/>}
    </nav>
  </main>;
}
