"use client";

import { FormEvent, useState } from "react";
import type { ScanActionMode } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";

export function ScanActionModeForm({ current }: { current: ScanActionMode }) {
  const [mode, setMode] = useState<ScanActionMode>(current);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true); setMessage(""); setError(false);
    try {
      const response = await fetch("/api/profile/scan-action-mode", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scanActionMode: mode })
      });
      await response.json();
      setError(!response.ok);
      setMessage(response.ok ? "QR 처리 방식을 저장했습니다." : "설정을 저장하지 못했습니다.");
    } catch {
      setError(true);
      setMessage("설정을 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="stack" onSubmit={save}>
      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label" style={{ marginBottom: 8 }}>장비 QR 처리 방식</legend>
        <label className={`choice-card card ${mode === "IMMEDIATE" ? "choice-active" : ""}`}>
          <input type="radio" name="scanActionMode" value="IMMEDIATE" checked={mode === "IMMEDIATE"} onChange={() => setMode("IMMEDIATE")} />
          <span><strong>즉시 대여·반납</strong><small>QR을 스캔하면 가능한 대여 또는 반납 작업을 바로 실행합니다. · 기본</small></span>
        </label>
        <label className={`choice-card card ${mode === "CONFIRM" ? "choice-active" : ""}`}>
          <input type="radio" name="scanActionMode" value="CONFIRM" checked={mode === "CONFIRM"} onChange={() => setMode("CONFIRM")} />
          <span><strong>버튼으로 확인</strong><small>QR 스캔 후 장비 상태를 확인하고 대여·반납 버튼을 누릅니다.</small></span>
        </label>
      </fieldset>
      {message ? <div role={error ? "alert" : "status"} className={`notice ${error ? "notice-error" : "notice-info"}`}>{message}</div> : null}
      <Button disabled={pending}>{pending ? "저장 중…" : "스캔 설정 저장"}</Button>
    </form>
  );
}
