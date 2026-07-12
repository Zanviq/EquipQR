import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { prisma } from "@/server/db/client";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { assignments: { where: { endedAt: null } } } } } });
  return <main className="admin-wrap stack" style={{ gap: 28 }}><header><p className="eyebrow">People</p><h1 className="page-title">사용자 관리</h1><p className="page-copy">계정을 등록하고 활성 상태와 보유 장비를 관리합니다.</p></header>
    <details className="card admin-panel"><summary>새 사용자 등록</summary><AdminForm endpoint="/api/admin/users" submitLabel="사용자 등록"><div className="admin-form-grid"><label className="field"><span>사번</span><input className="input" name="employeeNumber" required /></label><label className="field"><span>이름</span><input className="input" name="name" required /></label><label className="field"><span>초기 비밀번호</span><input className="input" name="password" type="password" minLength={12} required /></label><label className="field"><span>권한</span><select className="select" name="role"><option value="EMPLOYEE">일반 직원</option><option value="ADMIN">관리자</option></select></label></div></AdminForm></details>
    <section className="data-table-wrap"><table className="data-table"><thead><tr><th>사번</th><th>이름</th><th>권한</th><th>상태</th><th>보유</th><th>작업</th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td className="font-data">{user.employeeNumber}</td><td>{user.name}</td><td>{user.role === "ADMIN" ? "관리자" : "직원"}</td><td>{user.status === "ACTIVE" ? "활성" : "비활성"}</td><td>{user._count.assignments}대</td><td><Link className="text-link" href={`/admin/users/${user.employeeNumber}`}>관리</Link></td></tr>)}</tbody></table></section>
  </main>;
}
