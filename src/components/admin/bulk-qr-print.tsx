"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { calculateQrPrintLayout } from "@/lib/qr-print-layout";

const STORAGE_KEY = "equipqr:print-equipment";

type PrintItem = { id: string; name: string; assetNumber: string; qrUrl: string; qr?: string };

export function BulkQrPrint() {
  const [items, setItems] = useState<PrintItem[]>([]);
  const [labelWidth, setLabelWidth] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const labelHeight = Math.max(24, Math.round(labelWidth * .6));
  const layout = useMemo(() => calculateQrPrintLayout({ labelWidthMm: labelWidth, labelHeightMm: labelHeight, itemCount: items.length }), [items.length, labelHeight, labelWidth]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
        const ids = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(0, 200) : [];
        if (ids.length === 0) { setLoading(false); return; }
        const response = await fetch("/api/admin/equipment/print-data", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids })
        });
        const body = await response.json() as { items?: PrintItem[]; message?: string };
        if (!response.ok || !body.items) throw new Error(body.message ?? "인쇄할 장비를 불러오지 못했습니다.");
        const withQr = await Promise.all(body.items.map(async (item) => ({
          ...item,
          qr: await QRCode.toDataURL(item.qrUrl, { errorCorrectionLevel: "M", margin: 4, width: 512 })
        })));
        if (active) setItems(withQr);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "인쇄할 장비를 불러오지 못했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const pages = Array.from({ length: layout.pageCount }, (_, index) => items.slice(index * layout.perPage, (index + 1) * layout.perPage));
  const pageStyle = {
    "--qr-label-width": `${labelWidth}mm`,
    "--qr-label-height": `${labelHeight}mm`,
    "--qr-print-columns": layout.columns
  } as CSSProperties;

  async function printLabels() {
    if (document.fonts?.ready) await document.fonts.ready;
    const images = Array.from(document.querySelectorAll<HTMLImageElement>(".qr-print-label img"));
    await Promise.all(images.map((image) => image.complete || typeof image.decode !== "function" ? Promise.resolve() : image.decode().catch(() => undefined)));
    window.print();
  }

  return <main className="admin-wrap stack qr-print-workspace" style={{ gap: 24 }}>
    <header className="print-hidden"><p className="eyebrow">QR label studio</p><h1 className="page-title">QR 일괄 인쇄</h1><p className="page-copy">선택한 장비 라벨의 크기와 A4 배치를 확인합니다.</p></header>
    <section className="card admin-panel stack print-hidden qr-print-controls">
      <div className="row-between"><label className="field" style={{ flex: 1 }}><span>라벨 너비</span><input aria-label="라벨 너비" type="range" min="40" max="80" step="5" value={labelWidth} onChange={(event) => setLabelWidth(Number(event.target.value))}/></label><strong className="font-data">{labelWidth}×{labelHeight}mm</strong></div>
      <div className="row-between"><span>{layout.columns}열 × {layout.rows}행 · 페이지당 최대 {layout.perPage}개</span><strong>{items.length}개 라벨 · {layout.pageCount}페이지</strong></div>
      <div className="row"><button className="button button-primary" type="button" disabled={loading || items.length === 0} onClick={printLabels}>인쇄하기</button><Link className="button button-secondary" href="/admin/equipment">선택 변경</Link></div>
      <p className="page-copy">인쇄 창에서 배율 100%, 머리글과 바닥글 끄기를 권장합니다.</p>
    </section>
    {loading ? <div className="notice notice-info print-hidden">QR 라벨을 만들고 있습니다…</div> : null}
    {error ? <div className="notice notice-error print-hidden" role="alert">{error}</div> : null}
    {!loading && !error && items.length === 0 ? <div className="card empty-state print-hidden"><strong>선택된 장비가 없습니다.</strong><p>장비 관리에서 인쇄할 장비를 먼저 선택해 주세요.</p><Link className="button button-primary" href="/admin/equipment">장비 선택</Link></div> : null}
    <div className="qr-print-preview">
      {pages.map((page, pageIndex) => <section className="qr-print-page" style={pageStyle} key={pageIndex} aria-label={`${pageIndex + 1}페이지`}>
        {page.map((item) => <article className="qr-print-label" key={item.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.qr} alt={`${item.name} QR`} width="512" height="512"/>
          <div><strong>{item.name}</strong><span className="font-data">{item.assetNumber}</span><small>EquipQR</small></div>
        </article>)}
      </section>)}
    </div>
  </main>;
}
