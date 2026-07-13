import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { EmployeeNav } from "@/components/navigation/employee-nav";
import { LogoutButton } from "@/components/navigation/logout-button";
import { getCurrentUser } from "@/server/auth/current-user";
import { NotificationCenter } from "@/components/notifications/notification-center";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    const returnTo = (await headers()).get("x-equipqr-return-to") ?? "/scan";
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="wordmark" href="/scan"><span className="wordmark-mark">EQ</span><span>EquipQR</span></Link>
          <div className="row">
            {user.role === "ADMIN" ? <Link href="/admin" style={{ color: "var(--primary)", fontWeight: 650 }}>관리자</Link> : null}
            <span style={{ fontSize: 14 }}>{user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <NotificationCenter />
      {children}
      <EmployeeNav />
    </div>
  );
}
