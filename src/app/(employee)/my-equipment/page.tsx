import Link from "next/link";
import { EquipmentPassport } from "@/components/equipment/equipment-passport";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db/client";
import { getEffectiveStatus } from "@/server/equipment/effective-status";

const date = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" });

export default async function MyEquipmentPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const now = new Date();
  const assignments = await prisma.assignment.findMany({
    where: { userId: user.id, endedAt: null },
    orderBy: { startedAt: "desc" },
    include: {
      equipment: {
        include: { transferTickets: { where: { usedAt: null, cancelledAt: null, expiresAt: { gt: now } }, take: 1 } }
      }
    }
  });
  return (
    <main className="page-wrap stack" style={{ gap: 24 }}>
      <header><div className="eyebrow">My equipment</div><h1 className="page-title">내가 보유한 장비</h1><p className="page-copy">현재 책임자로 등록된 장비 {assignments.length}대입니다.</p></header>
      {assignments.length ? assignments.map((assignment) => {
        const status = getEffectiveStatus({
          operationalStatus: assignment.equipment.operationalStatus,
          hasActiveAssignment: true,
          hasValidTicket: assignment.equipment.transferTickets.length > 0
        });
        const mode = assignment.transferModeSnapshot === "TRANSFER_QR" ? "전달 QR 방식" : "장비 QR 즉시 전달";
        return (
          <EquipmentPassport key={assignment.id} name={assignment.equipment.name} assetNumber={assignment.equipment.assetNumber} status={status} meta={`${date.format(assignment.startedAt)} · ${mode}`}>
            <Link className="button button-primary" href={`/scan/equipment/${assignment.equipment.publicCode}`}>장비 작업</Link>
          </EquipmentPassport>
        );
      }) : <div className="card empty-state"><strong>보유 중인 장비가 없습니다.</strong><p>장비 QR을 스캔해 대여를 시작하세요.</p><Link className="button button-primary" href="/scan">QR 스캔</Link></div>}
    </main>
  );
}
