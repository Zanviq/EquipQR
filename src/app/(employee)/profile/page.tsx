import { TransferModeForm } from "@/components/profile/transfer-mode-form";
import { ScanActionModeForm } from "@/components/profile/scan-action-mode-form";
import { getCurrentUser } from "@/server/auth/current-user";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <main className="page-wrap stack" style={{ gap: 28 }}>
      <header><div className="eyebrow">My profile</div><h1 className="page-title">{user.name}님의 설정</h1><p className="page-copy font-data">{user.employeeNumber}</p></header>
      <section className="card stack" style={{ padding: 24 }}>
        <h2 className="section-title">QR 대여·반납 방식</h2>
        <p className="page-copy">장비 QR을 스캔했을 때 대여와 반납을 처리하는 방식을 정합니다.</p>
        <ScanActionModeForm current={user.scanActionMode} />
      </section>
      <section className="card stack" style={{ padding: 24 }}>
        <h2 className="section-title">장비 전달 정책</h2>
        <p className="page-copy">새로 대여하는 장비가 다음 사용자에게 전달되는 방법을 정합니다.</p>
        <TransferModeForm current={user.defaultTransferMode} />
      </section>
    </main>
  );
}
