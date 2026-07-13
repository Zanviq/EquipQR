"use client";

import { useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
};

export function NotificationCenter() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (!active || inFlight.current || document.visibilityState === "hidden") return;
      inFlight.current = true;
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as { notifications?: NotificationItem[] };
        const notifications = body.notifications ?? [];
        if (!active || notifications.length === 0) return;
        setItems((current) => {
          const known = new Set(current.map((item) => item.id));
          return [...current, ...notifications.filter((item) => !known.has(item.id))].slice(-10);
        });
        const ids = notifications.map((item) => item.id);
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ auditEventIds: ids })
        });
      } catch {
        // 다음 polling에서 다시 확인한다.
      } finally {
        inFlight.current = false;
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 10_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  if (items.length === 0) return null;
  return (
    <aside className="notification-center" aria-live="polite" aria-label="작업 알림">
      {items.map((item) => (
        <article className="notification-toast" key={item.id}>
          <span aria-hidden="true">✓</span>
          <div><strong>{item.title}</strong><p>{item.message}</p></div>
          <button type="button" aria-label="알림 닫기" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}>×</button>
        </article>
      ))}
    </aside>
  );
}
