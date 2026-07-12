"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function trustedPath(value: string) {
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return url.pathname.startsWith("/scan/equipment/") || url.pathname.startsWith("/transfer/") ? `${url.pathname}${url.search}` : null;
  } catch {
    return null;
  }
}

export function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let controls: { stop(): void } | null = null;
    let active = true;
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!active || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
        controls = await reader.decodeFromStream(stream, videoRef.current, (result) => {
          const path = result ? trustedPath(result.getText()) : null;
          if (path && active) {
            active = false;
            controls?.stop();
            router.push(path);
          }
        });
      } catch {
        if (active) setCameraError(true);
      }
    }
    void start();
    return () => {
      active = false;
      controls?.stop();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [router]);

  async function submitAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const assetNumber = String(form.get("assetNumber") ?? "").trim();
    const response = await fetch(`/api/equipment/by-asset/${encodeURIComponent(assetNumber)}`);
    const body = await response.json();
    if (!response.ok) return setError(body.message ?? "장비를 찾을 수 없습니다.");
    router.push(`/scan/equipment/${body.publicCode}`);
  }

  return (
    <div className="stack">
      <div className="scanner">
        <video ref={videoRef} muted playsInline aria-label="장비 QR 카메라 화면" />
        <div className="scan-frame" aria-hidden="true">
          <i className="scan-corner" /><i className="scan-corner" /><i className="scan-corner" /><i className="scan-corner" />
        </div>
        <p className="scanner-copy">장비 QR을 프레임 안에 맞춰 주세요.</p>
      </div>
      {cameraError ? <div className="notice notice-info">카메라를 사용할 수 없습니다. 자산번호로 장비를 찾을 수 있습니다.</div> : null}
      <Button variant="secondary" className="button-block" onClick={() => setManual((value) => !value)}>자산번호로 찾기</Button>
      {manual ? (
        <form className="stack card" style={{ padding: 20 }} onSubmit={submitAsset}>
          <div className="field">
            <label htmlFor="assetNumber">자산번호</label>
            <input className="input font-data" id="assetNumber" name="assetNumber" required placeholder="예: EQ-0012" />
          </div>
          {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
          <Button>장비 찾기</Button>
        </form>
      ) : null}
    </div>
  );
}
