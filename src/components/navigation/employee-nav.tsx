"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/scan", symbol: "⌗", label: "스캔" },
  { href: "/my-equipment", symbol: "▣", label: "내 장비" },
  { href: "/profile", symbol: "◉", label: "프로필" }
];

export function EmployeeNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav" aria-label="직원 메뉴">
      {items.map((item) => (
        <Link key={item.href} href={item.href} aria-current={pathname.startsWith(item.href) ? "page" : undefined}>
          <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>{item.symbol}</span><span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
