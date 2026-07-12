"use client";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }
  return <button className="button button-secondary" onClick={logout}>로그아웃</button>;
}
