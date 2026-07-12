"use client";

export function PrintButton() {
  return <button className="button button-secondary print-hidden" type="button" onClick={() => window.print()}>QR 라벨 인쇄</button>;
}
