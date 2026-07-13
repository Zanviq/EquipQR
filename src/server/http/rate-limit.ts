import { DomainError } from "@/server/domain/errors";

type Window = { count: number; resetsAt: number };

type RateLimitInput = { key: string; limit: number; windowMs: number; now?: number };

export function createRateLimiter({ maxEntries = 10_000 }: { maxEntries?: number } = {}) {
  if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new Error("maxEntries must be a positive integer");
  const windows = new Map<string, Window>();
  let nextExpiry = Number.POSITIVE_INFINITY;
  let fullSweepCount = 0;

  function sweepExpired(now = Date.now()) {
    fullSweepCount += 1;
    let removed = 0;
    let earliest = Number.POSITIVE_INFINITY;
    for (const [key, value] of windows) {
      if (value.resetsAt <= now) {
        windows.delete(key);
        removed += 1;
      } else {
        earliest = Math.min(earliest, value.resetsAt);
      }
    }
    nextExpiry = earliest;
    return removed;
  }

  function assertCapacity(key: string, now: number) {
    if (windows.has(key)) return;
    if (windows.size < maxEntries) return;
    if (now >= nextExpiry) sweepExpired(now);
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
      const resetsAt = now + input.windowMs;
      windows.set(input.key, { count: 1, resetsAt });
      nextExpiry = Math.min(nextExpiry, resetsAt);
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
    reset: () => {
      windows.clear();
      nextExpiry = Number.POSITIVE_INFINITY;
      fullSweepCount = 0;
    },
    size: () => windows.size,
    fullSweepCountForTest: () => fullSweepCount,
    sweepExpired
  };
}

export const LOGIN_RATE_LIMIT_MAX_ENTRIES = 10_000;
const applicationRateLimiter = createRateLimiter();
const loginRateLimiter = createRateLimiter({ maxEntries: LOGIN_RATE_LIMIT_MAX_ENTRIES });

export function requestIp(request: Request) {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}

export function enforceRateLimit(input: RateLimitInput) {
  return applicationRateLimiter.reserveAttempt(input);
}

export function reserveLoginRateLimitAttempt(input: RateLimitInput) {
  return loginRateLimiter.reserveAttempt(input);
}

export function clearLoginRateLimit(key: string) { loginRateLimiter.clear(key); }

export function loginRateLimitSizeForTest() { return loginRateLimiter.size(); }

export function resetRateLimitsForTest() {
  applicationRateLimiter.reset();
  loginRateLimiter.reset();
}
