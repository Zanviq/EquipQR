"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EffectiveStatus } from "@/server/equipment/effective-status";
import { StatusBadge } from "@/components/equipment/status-badge";

const STORAGE_KEY = "equipqr:print-equipment";
const MAX_SELECTION = 200;
const SELECTION_EVENT = "equipqr:print-equipment-change";

function subscribeSelection(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SELECTION_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SELECTION_EVENT, onStoreChange);
  };
}

function getSelectionSnapshot() {
  return sessionStorage.getItem(STORAGE_KEY) ?? "[]";
}

function parseSelection(value: string) {
  try {
    const stored = JSON.parse(value) as unknown;
    return Array.isArray(stored)
      ? stored.filter((id): id is string => typeof id === "string").slice(0, MAX_SELECTION)
      : [];
  } catch {
    return [];
  }
}

export type PrintableEquipmentRow = {
  id: string;
  assetNumber: string;
  name: string;
  status: EffectiveStatus;
  currentUser: string | null;
  manageHref: string;
};

export function EquipmentPrintSelection({ items }: { items: PrintableEquipmentRow[] }) {
  const router = useRouter();
  const selectionSnapshot = useSyncExternalStore(subscribeSelection, getSelectionSnapshot, () => "[]");
  const selected = useMemo(() => parseSelection(selectionSnapshot), [selectionSnapshot]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const pageIds = items.map((item) => item.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id));

  function save(next: string[]) {
    const limited = [...new Set(next)].slice(0, MAX_SELECTION);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
    window.dispatchEvent(new Event(SELECTION_EVENT));
  }

  function toggle(id: string) {
    save(selectedSet.has(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }

  function togglePage() {
    if (allOnPage) save(selected.filter((id) => !pageIds.includes(id)));
    else save([...selected, ...pageIds]);
  }

  return <section className="stack">
    <div className="print-selection-toolbar">
      <label className="row"><input type="checkbox" checked={allOnPage} onChange={togglePage}/> 현재 페이지 전체 선택</label>
      <strong>{selected.length}개 선택됨</strong>
      <button className="button button-secondary" type="button" disabled={selected.length === 0} onClick={() => router.push("/admin/equipment/print")}>선택한 QR 인쇄</button>
      {selected.length ? <button className="text-link print-selection-clear" type="button" onClick={() => save([])}>선택 초기화</button> : null}
    </div>
    <div className="data-table-wrap"><table className="data-table"><thead><tr><th aria-label="인쇄 선택"/><th>자산번호</th><th>장비명</th><th>상태</th><th>현재 사용자</th><th>작업</th></tr></thead><tbody>{items.map((item) => (
      <tr key={item.id} className={selectedSet.has(item.id) ? "print-selected-row" : undefined}>
        <td><input type="checkbox" aria-label={`${item.name} ${item.assetNumber} 선택`} checked={selectedSet.has(item.id)} onChange={() => toggle(item.id)}/></td>
        <td className="font-data">{item.assetNumber}</td><td>{item.name}</td><td><StatusBadge status={item.status}/></td><td>{item.currentUser ?? "—"}</td><td><Link className="text-link" href={item.manageHref}>관리·QR</Link></td>
      </tr>
    ))}</tbody></table>{items.length === 0 ? <div className="empty-state">조건에 맞는 장비가 없습니다.</div> : null}</div>
  </section>;
}
