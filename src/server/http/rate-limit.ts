import { DomainError } from "@/server/domain/errors";

type Window = { count: number; resetsAt: number };

type RateLimitInput = { key: string; limit: number; windowMs: number; now?: number };

export function createRateLimiter({ maxEntries = 10_000 }: { maxEntries?: number } = {}) {
  if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new Error("maxEntries must be a positive integer");
  const windows = new Map<string, Window>();

  function sweepExpired(now = Date.now()) {
    let removed = 0;
    for (const [key, value] of windows) {
      if (value.resetsAt <= now) {
        windows.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  function assertCapacity(key: string, now: number) {
    if (windows.has(key)) return;
    sweepExpired(now);
    if (windows.size >= maxEntries) {
      throw new DomainError("RATE_LIMITED", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", 429);
    }
  }

  function activeWindow(key: string, now: number) {
    const current = windows.get(key);
    if (current && current.resetsAt <= now) {
      windows.delete(key);
      return undefined;
    }
    return current;
  }

  function reserveAttempt(input: RateLimitInput) {
    const now = input.now ?? Date.now();
    const current = activeWindow(input.key, now);
    if (!current) {
      assertCapacity(input.key, now);
      windows.set(input.key, { count: 1, resetsAt: now + input.windowMs });
      return;
    }
    if (current.count >= input.limit) {
      throw new DomainError("RATE_LIMITED", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.", 429);
    }
    current.count += 1;
  }

  return {
    reserveAttempt,
    enforce: reserveAttempt,
    clear: (key: string) => windows.delete(key),
    reset: () => windows.clear(),
    size: () => windows.size,
    sweepExpired
  };
}

const defaultRateLimiter = createRateLimiter();

export function requestIp(request: Request) {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}

export function enforceRateLimit(input: RateLimitInput) {
  return defaultRateLimiter.reserveAttempt(input);
}

export function reserveRateLimitAttempt(input: RateLimitInput) {
  return defaultRateLimiter.reserveAttempt(input);
}

export function clearRateLimit(key: string) { defaultRateLimiter.clear(key); }

export function resetRateLimitsForTest() { defaultRateLimiter.reset(); }
