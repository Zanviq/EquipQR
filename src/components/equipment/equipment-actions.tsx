"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import type { ScanActionMode } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";

type Action = "CHECKOUT" | "RETURN" | "CREATE_TRANSFER_TICKET" | "INSTANT_TRANSFER";

export function EquipmentActions({ publicCode, actions, scanActionMode }: { publicCode: string; actions: Action[]; scanActionMode: ScanActionMode }) {
  const instantTransfer = actions.includes("INSTANT_TRANSFER");
  const automaticAction = scanActionMode === "IMMEDIATE"
    ? actions.find((action): action is "CHECKOUT" | "RETURN" => action === "CHECKOUT" || action === "RETURN")
    : undefined;
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [completion, setCompletion] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(instantTransfer || Boolean(automaticAction));
  const [ticket, setTicket] = useState<{ id: string; qr: string; expiresAt: string } | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const mountedRef = useRef(false);
  const automaticRequestRef = useRef<string | null>(null);

  async function post(path: string, options: { refresh?: boolean; complete?: boolean } = {}) {
    setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch(path, { method: "POST" });
      const body = await response.json() as { message?: string; [key: string]: unknown };
      if (!response.ok) { setError(body.message ?? "작업을 완료하지 못했습니다."); return null; }
      if (options.complete) setCompletion(body.message ?? "작업이 완료되었습니다.");
      else setMessage(body.message ?? "완료했습니다.");
      if (options.refresh) router.refresh();
      return body;
    } catch {
      setError("작업을 완료하지 못했습니다.");
      return null;
    } finally {
      setPending(false);
    }
  }

  async function createTicket() {
    const body = await post(`/api/equipment/${encodeURIComponent(publicCode)}/transfer-tickets`);
    if (!body) return;
    const url = `${window.location.origin}/transfer/${String(body.token)}`;
    const qr = await QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 4, width: 320 });
    const expiresAt = String(body.expiresAt);
    setTicket({ id: String(body.ticketId), qr, expiresAt });
    setRemainingSeconds(Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)));
  }

  useEffect(() => {
    if (!ticket) return;
    const timer = window.setInterval(() => setRemainingSeconds(Math.max(0, Math.ceil((new Date(ticket.expiresAt).getTime() - Date.now()) / 1000))), 1000);
    return () => window.clearInterval(timer);
  }, [ticket]);

  useEffect(() => {
    if (!completion) return;
    const timer = window.setTimeout(() => router.replace("/my-equipment"), 1200);
    return () => window.clearTimeout(timer);
  }, [completion, router]);

  useEffect(() => {
    mountedRef.current = true;
    const requestKey = instantTransfer ? `INSTANT_TRANSFER:${publicCode}` : automaticAction ? `${automaticAction}:${publicCode}` : null;
    const requestPath = instantTransfer
      ? `/api/equipment/${encodeURIComponent(publicCode)}/instant-transfer`
      : automaticAction
        ? `/api/equipment/${encodeURIComponent(publicCode)}/${automaticAction === "CHECKOUT" ? "checkout" : "return"}`
        : null;
    if (requestKey && requestPath && automaticRequestRef.current !== requestKey) {
      automaticRequestRef.current = requestKey;
      void (async () => {
        try {
          const response = await fetch(requestPath, { method: "POST" });
          const body = await response.json() as { message?: string };
          if (!mountedRef.current || automaticRequestRef.current !== requestKey) return;
          if (!response.ok) setError(body.message ?? "작업을 완료하지 못했습니다.");
          else setCompletion(body.message ?? "작업이 완료되었습니다.");
        } catch {
          if (mountedRef.current && automaticRequestRef.current === requestKey) setError("네트워크 연결을 확인하고 다시 스캔해 주세요.");
        } finally {
          if (mountedRef.current && automaticRequestRef.current === requestKey) setPending(false);
        }
      })();
    }
    return () => { mountedRef.current = false; };
  }, [automaticAction, instantTransfer, publicCode, router]);

  if (completion) return (
    <section className="action-complete" role="status" aria-live="polite">
      <span className="action-complete-mark" aria-hidden="true">✓</span>
      <strong>{completion}</strong>
      <small>내 장비 화면으로 이동합니다.</small>
    </section>
  );

  if (ticket) return (
    <section className="card stack" style={{ padding: 24, textAlign: "center" }}>
      <div className="eyebrow">One-time transfer</div>
      <h2 className="section-title">다음 사용자가 이 QR을 스캔하세요.</h2>
      {remainingSeconds > 0 ? <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ticket.qr} alt="10분 동안 한 번 사용할 수 있는 장비 전달 QR" width={280} height={280} style={{ width: "min(100%, 280px)", margin: "0 auto" }} />
        <time dateTime={ticket.expiresAt} className="equipment-passport-meta">{String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")} 남음</time>
      </> : <div className="notice notice-error">전달 QR이 만료되었습니다. 새 QR을 만들어 주세요.</div>}
      {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
      <Button variant="secondary" disabled={pending} onClick={async () => {
        const body = await post(`/api/transfer-tickets/${ticket.id}/cancel`, { refresh: true });
        if (body) setTicket(null);
      }}>전달 QR 취소</Button>
    </section>
  );

  return (
    <div className="stack">
      {message ? <div className="notice notice-info" role="status">{message}</div> : null}
      {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
      {actions.includes("CHECKOUT") ? <Button disabled={pending} onClick={() => post(`/api/equipment/${encodeURIComponent(publicCode)}/checkout`, { complete: true })}>대여하기</Button> : null}
      {actions.includes("RETURN") ? <Button disabled={pending} onClick={() => post(`/api/equipment/${encodeURIComponent(publicCode)}/return`, { complete: true })}>반납하기</Button> : null}
      {actions.includes("CREATE_TRANSFER_TICKET") ? <Button variant="secondary" disabled={pending} onClick={createTicket}>전달 QR 만들기</Button> : null}
      {instantTransfer && pending ? <div className="notice notice-info">장비 책임자를 변경하고 있습니다…</div> : null}
      {automaticAction && pending ? <div className="notice notice-info">{automaticAction === "CHECKOUT" ? "장비를 대여하고 있습니다…" : "장비를 반납하고 있습니다…"}</div> : null}
    </div>
  );
}
