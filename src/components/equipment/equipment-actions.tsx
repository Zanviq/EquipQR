"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";

type Action = "CHECKOUT" | "RETURN" | "CREATE_TRANSFER_TICKET" | "INSTANT_TRANSFER";

export function EquipmentActions({ publicCode, actions }: { publicCode: string; actions: Action[] }) {
  const instantTransfer = actions.includes("INSTANT_TRANSFER");
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(instantTransfer);
  const [ticket, setTicket] = useState<{ id: string; qr: string; expiresAt: string } | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  async function post(path: string, refresh = false) {
    setPending(true); setError(""); setMessage("");
    const response = await fetch(path, { method: "POST" });
    const body = await response.json();
    setPending(false);
    if (!response.ok) { setError(body.message ?? "작업을 완료하지 못했습니다."); return null; }
    setMessage(body.message ?? "완료했습니다.");
    if (refresh) router.refresh();
    return body;
  }

  async function createTicket() {
    const body = await post(`/api/equipment/${encodeURIComponent(publicCode)}/transfer-tickets`);
    if (!body) return;
    const url = `${window.location.origin}/transfer/${body.token}`;
    const qr = await QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 4, width: 320 });
    setTicket({ id: body.ticketId, qr, expiresAt: body.expiresAt });
    setRemainingSeconds(Math.max(0, Math.ceil((new Date(body.expiresAt).getTime() - Date.now()) / 1000)));
  }

  useEffect(() => {
    if (!ticket) return;
    const timer = window.setInterval(() => setRemainingSeconds(Math.max(0, Math.ceil((new Date(ticket.expiresAt).getTime() - Date.now()) / 1000))), 1000);
    return () => window.clearInterval(timer);
  }, [ticket]);

  useEffect(() => {
    if (!instantTransfer) return;
    void fetch(`/api/equipment/${encodeURIComponent(publicCode)}/instant-transfer`, { method: "POST" })
      .then(async (response) => ({ response, body: await response.json() }))
      .then(({ response, body }) => {
        if (!response.ok) setError(body.message ?? "작업을 완료하지 못했습니다.");
        else { setMessage(body.message ?? "전달을 완료했습니다."); router.refresh(); }
      })
      .catch(() => setError("네트워크 연결을 확인하고 다시 스캔해 주세요."))
      .finally(() => setPending(false));
    // The scan itself is the user's intent; run exactly once for this public code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicCode]);

  if (ticket) return (
    <section className="card stack" style={{ padding: 24, textAlign: "center" }}>
      <div className="eyebrow">One-time transfer</div>
      <h2 className="section-title">다음 사용자가 이 QR을 스캔하세요.</h2>
      {remainingSeconds > 0 ? <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ticket.qr} alt="10분 동안 한 번 사용할 수 있는 장비 전달 QR" width={280} height={280} style={{ width: "min(100%, 280px)", margin: "0 auto" }} />
        <time dateTime={ticket.expiresAt} className="equipment-passport-meta">{String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")} 남음</time>
      </> : <div className="notice notice-error">전달 QR이 만료되었습니다. 새 QR을 만들어 주세요.</div>}
      <Button variant="secondary" onClick={async () => { await post(`/api/transfer-tickets/${ticket.id}/cancel`, true); setTicket(null); }}>전달 QR 취소</Button>
    </section>
  );

  return (
    <div className="stack">
      {message ? <div className="notice notice-info" role="status">{message}</div> : null}
      {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
      {actions.includes("CHECKOUT") ? <Button disabled={pending} onClick={() => post(`/api/equipment/${publicCode}/checkout`, true)}>대여하기</Button> : null}
      {actions.includes("RETURN") ? <Button disabled={pending} onClick={() => post(`/api/equipment/${publicCode}/return`, true)}>반납하기</Button> : null}
      {actions.includes("CREATE_TRANSFER_TICKET") ? <Button variant="secondary" disabled={pending} onClick={createTicket}>전달 QR 만들기</Button> : null}
      {instantTransfer && pending ? <div className="notice notice-info">장비 책임자를 변경하고 있습니다…</div> : null}
    </div>
  );
}
