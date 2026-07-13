"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { safeReturnTo } from "@/lib/safe-return-to";

export function LoginForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ employeeNumber: form.get("employeeNumber"), password: form.get("password") })
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) {
        setError(body.message ?? "로그인하지 못했습니다.");
        return;
      }
      router.replace(safeReturnTo(returnTo));
      router.refresh();
    } catch {
      setError("로그인하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="employeeNumber">사번</label>
        <input className="input" id="employeeNumber" name="employeeNumber" autoComplete="username" required autoFocus />
      </div>
      <div className="field">
        <label htmlFor="password">비밀번호</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
      <Button className="button-block" disabled={pending}>{pending ? "확인 중…" : "로그인"}</Button>
    </form>
  );
}
