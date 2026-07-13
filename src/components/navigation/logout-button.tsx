"use client";

import { useState } from "react";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const body = await response.json() as { message?: string };
      if (!response.ok) {
        setError(body.message ?? "로그아웃하지 못했습니다.");
        return;
      }
      window.location.assign("/login");
    } catch {
      setError("로그아웃하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }
  return <div className="stack" style={{ gap: 8 }}>
    <button className="button button-secondary" disabled={pending} onClick={logout}>{pending ? "로그아웃 중…" : "로그아웃"}</button>
    {error ? <span className="notice notice-error" role="alert">{error}</span> : null}
  </div>;
}
