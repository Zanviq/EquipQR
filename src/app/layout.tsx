import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EquipQR",
  description: "QR 기반 사내 장비 대여·반납·전달 관리"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
