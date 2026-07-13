import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { LogoutButton } from "@/components/navigation/logout-button";
import { getCurrentUser } from "@/server/auth/current-user";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/admin");
  if (user.role !== "ADMIN") redirect("/scan");
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="wordmark" href="/admin"><span className="wordmark-mark">EQ</span><span>EquipQR</span></Link>
      <p className="admin-label">운영 콘솔</p><AdminNav />
      <div className="admin-user"><strong>{user.name}</strong><span className="font-data">{user.employeeNumber}</span><LogoutButton /></div>
    </aside>
    <div className="admin-main"><header className="admin-mobilebar"><Link className="wordmark" href="/admin"><span className="wordmark-mark">EQ</span>EquipQR</Link><AdminNav /><Link href="/scan">직원 화면</Link><LogoutButton /></header>{children}</div>
  </div>;
}
