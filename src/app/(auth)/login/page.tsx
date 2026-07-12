import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/server/auth/current-user";
import { safeReturnTo } from "@/lib/safe-return-to";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo = "/scan" } = await searchParams;
  if (await getCurrentUser()) redirect(safeReturnTo(returnTo));
  return (
    <main className="login-page">
      <section className="login-card card">
        <div className="wordmark" aria-label="EquipQR">
          <span className="wordmark-mark">EQ</span><span>EquipQR</span>
        </div>
        <div>
          <div className="eyebrow">Equipment passport</div>
          <h1 className="page-title">장비의 지금을<br />한 번에 확인하세요.</h1>
          <p className="page-copy">사번으로 로그인하고 장비 QR을 스캔하세요.</p>
        </div>
        <LoginForm returnTo={returnTo} />
      </section>
    </main>
  );
}
