import { DomainError } from "@/server/domain/errors";

type Window = { count: number; resetsAt: number };
const windows = new Map<string, Window>();

export function requestIp(request: Request) {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}

export function enforceRateLimit(input: { key: string; limit: number; windowMs: number; now?: number }) {
  const now = input.now ?? Date.now();
  const current = windows.get(input.key);
  if (!current || current.resetsAt <= now) {
    windows.set(input.key, { count: 1, resetsAt: now + input.windowMs });
  } else {
    current.count += 1;
    if (current.count > input.limit) throw new DomainError("RATE_LIMITED", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", 429);
  }
  if (windows.size > 10_000) {
    for (const [key, value] of windows) if (value.resetsAt <= now) windows.delete(key);
  }
}

export function resetRateLimitsForTest() { windows.clear(); }
