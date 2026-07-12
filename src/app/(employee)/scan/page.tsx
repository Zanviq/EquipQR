import { QrScanner } from "@/components/scan/qr-scanner";

export default function ScanPage() {
  return (
    <main className="page-wrap stack" style={{ gap: 24 }}>
      <header>
        <div className="eyebrow">Scan equipment</div>
        <h1 className="page-title">장비를 스캔하세요.</h1>
        <p className="page-copy">현재 상태에 맞는 대여·반납·전달 작업을 바로 실행합니다.</p>
      </header>
      <QrScanner />
    </main>
  );
}
