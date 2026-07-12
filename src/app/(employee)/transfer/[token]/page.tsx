import { AcceptTransfer } from "@/components/transfer/accept-transfer";

export default async function TransferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="page-wrap stack" style={{ gap: 24 }}>
      <header><div className="eyebrow">Responsibility transfer</div><h1 className="page-title">장비를 전달받습니다.</h1><p className="page-copy">완료되면 이 장비의 책임자가 현재 계정으로 변경됩니다.</p></header>
      <AcceptTransfer token={token} />
    </main>
  );
}
