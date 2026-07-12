"use client";

import { FormEvent, useState } from "react";
import type { TransferMode } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";

export function TransferModeForm({ current }: { current: TransferMode }) {
  const [mode, setMode] = useState<TransferMode>(current);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault(); setPending(true); setMessage("");
    const response = await fetch("/api/profile/transfer-mode", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transferMode: mode })
    });
    setPending(false);
    setMessage(response.ok ? "다음 신규 대여의 전달 방식을 저장했습니다." : "설정을 저장하지 못했습니다.");
  }
  return (
    <form className="stack" onSubmit={save}>
      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label" style={{ marginBottom: 8 }}>기본 전달 방식</legend>
        <label className={`choice-card card ${mode === "TRANSFER_QR" ? "choice-active" : ""}`}>
          <input type="radio" name="mode" value="TRANSFER_QR" checked={mode === "TRANSFER_QR"} onChange={() => setMode("TRANSFER_QR")} />
          <span><strong>전달 QR 방식</strong><small>내가 만든 10분짜리 QR을 다음 사용자가 스캔합니다. · 기본</small></span>
        </label>
        <label className={`choice-card card ${mode === "INSTANT_EQUIPMENT_QR" ? "choice-active" : ""}`}>
          <input type="radio" name="mode" value="INSTANT_EQUIPMENT_QR" checked={mode === "INSTANT_EQUIPMENT_QR"} onChange={() => setMode("INSTANT_EQUIPMENT_QR")} />
          <span><strong>장비 QR 즉시 전달</strong><small>다음 사용자가 장비 QR을 스캔하면 책임자가 즉시 변경됩니다.</small></span>
        </label>
      </fieldset>
      <div className="notice notice-info">이미 보유한 장비에는 적용되지 않습니다.</div>
      {message ? <div role="status" className="notice notice-info">{message}</div> : null}
      <Button disabled={pending}>{pending ? "저장 중…" : "설정 저장"}</Button>
    </form>
  );
}
