"use client";

import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";

export function AdminForm({ endpoint, method = "POST", submitLabel, confirmMessage, children, nullFields = [] }: {
  endpoint: string;
  method?: "POST" | "PATCH";
  submitLabel: string;
  confirmMessage?: string;
  children: ReactNode;
  nullFields?: string[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setPending(true); setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const nullableNames = new Set(nullFields);
    const body = Object.fromEntries(Array.from(form.entries(), ([name, value]) => [name, nullableNames.has(name) && value === "" ? null : value]));
    try {
      const response = await fetch(endpoint, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({})) as { message?: string; error?: { message?: string } };
      if (!response.ok) throw new Error(data.message || data.error?.message || "요청을 처리하지 못했습니다.");
      setMessage("처리했습니다.");
      formElement.reset();
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "요청을 처리하지 못했습니다."); }
    finally { setPending(false); }
  }
  return <form className="stack admin-form" onSubmit={submit}>{children}<Button type="submit" disabled={pending}>{pending ? "처리 중…" : submitLabel}</Button>{message ? <p className={message === "처리했습니다." ? "notice notice-info" : "notice notice-error"} aria-live="polite">{message}</p> : null}</form>;
}
