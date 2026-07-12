"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/admin", "대시보드"],
  ["/admin/equipment", "장비 관리"],
  ["/admin/users", "사용자 관리"],
  ["/admin/history", "이용 기록"]
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return <nav className="admin-nav" aria-label="관리자 메뉴">
    {links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href || (href !== "/admin" && pathname.startsWith(href)) ? "page" : undefined}>{label}</Link>)}
  </nav>;
}
