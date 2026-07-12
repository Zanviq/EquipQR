import { TransferModeForm } from "@/components/profile/transfer-mode-form";
import { getCurrentUser } from "@/server/auth/current-user";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <main className="page-wrap stack" style={{ gap: 28 }}>
      <header><div className="eyebrow">My profile</div><h1 className="page-title">{user.name}님의 설정</h1><p className="page-copy font-data">{user.employeeNumber}</p></header>
      <section className="card stack" style={{ padding: 24 }}>
        <h2 className="section-title">장비 전달 정책</h2>
        <p className="page-copy">새로 대여하는 장비가 다음 사용자에게 전달되는 방법을 정합니다.</p>
        <TransferModeForm current={user.defaultTransferMode} />
      </section>
    </main>
  );
}
