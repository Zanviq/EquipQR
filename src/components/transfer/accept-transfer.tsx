"use client";

import { useEffect, useRef, useState } from "react";

export function AcceptTransfer({ token }: { token: string }) {
  const [state, setState] = useState<{ pending: boolean; message: string; error: boolean; previousUserName?: string; nextUserName?: string; transferMode?: string }>({ pending: true, message: "전달 정보를 확인하고 있습니다.", error: false });
  const mountedRef = useRef(false);
  const acceptRequestRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    if (acceptRequestRef.current !== token) {
      acceptRequestRef.current = token;
      void (async () => {
        try {
          const response = await fetch(`/api/transfer/${encodeURIComponent(token)}/accept`, { method: "POST" });
          const body = await response.json() as { message?: string; previousUserName?: string; nextUserName?: string; transferMode?: string };
          if (mountedRef.current && acceptRequestRef.current === token) {
            setState({ pending: false, message: body.message ?? "전달 요청을 처리하지 못했습니다.", error: !response.ok, previousUserName: body.previousUserName, nextUserName: body.nextUserName, transferMode: body.transferMode });
          }
        } catch {
          if (mountedRef.current && acceptRequestRef.current === token) setState({ pending: false, message: "전달 요청을 처리하지 못했습니다.", error: true });
        }
      })();
    }
    return () => { mountedRef.current = false; };
  }, [token]);
  return <section className={`notice stack ${state.error ? "notice-error" : "notice-info"}`} role={state.error ? "alert" : "status"}><strong>{state.pending ? "확인 중…" : state.message}</strong>{!state.pending && !state.error ? <dl className="transfer-result"><div><dt>이전 사용자</dt><dd>{state.previousUserName}</dd></div><div><dt>새 사용자</dt><dd>{state.nextUserName}</dd></div><div><dt>앞으로의 전달 방식</dt><dd>{state.transferMode === "INSTANT_EQUIPMENT_QR" ? "장비 QR 즉시 전달" : "일회용 전달 QR"}</dd></div></dl> : null}</section>;
}
