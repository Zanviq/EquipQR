import { beforeEach, describe, expect, it } from "vitest";
import { createRateLimiter, enforceRateLimit, resetRateLimitsForTest } from "./rate-limit";

describe("rate limiter", () => {
  beforeEach(resetRateLimitsForTest);
  it("rejects excess requests and opens a fresh fixed window", () => {
    enforceRateLimit({ key: "login:ip", limit: 2, windowMs: 1000, now: 0 });
    enforceRateLimit({ key: "login:ip", limit: 2, windowMs: 1000, now: 1 });
    expect(() => enforceRateLimit({ key: "login:ip", limit: 2, windowMs: 1000, now: 2 })).toThrowError(expect.objectContaining({ code: "RATE_LIMITED" }));
    expect(() => enforceRateLimit({ key: "login:ip", limit: 2, windowMs: 1000, now: 1000 })).not.toThrow();
  });

  it("keeps the in-memory store at its hard maximum", () => {
    const limiter = createRateLimiter({ maxEntries: 2 });

    limiter.enforce({ key: "one", limit: 2, windowMs: 1000, now: 0 });
    limiter.enforce({ key: "two", limit: 2, windowMs: 1000, now: 1 });
    expect(() => limiter.enforce({ key: "three", limit: 2, windowMs: 1000, now: 2 }))
      .toThrowError(expect.objectContaining({ code: "RATE_LIMITED" }));

    expect(limiter.size()).toBe(2);
  });

  it("never evicts a live window to admit a new key", () => {
    const limiter = createRateLimiter({ maxEntries: 2 });
    limiter.enforce({ key: "protected", limit: 1, windowMs: 1000, now: 0 });
    limiter.enforce({ key: "second", limit: 2, windowMs: 1000, now: 1 });

    expect(() => limiter.enforce({ key: "capacity-attack", limit: 2, windowMs: 1000, now: 2 }))
      .toThrowError(expect.objectContaining({ code: "RATE_LIMITED" }));
    expect(() => limiter.enforce({ key: "protected", limit: 1, windowMs: 1000, now: 3 }))
      .toThrowError(expect.objectContaining({ code: "RATE_LIMITED" }));
  });

  it("reuses capacity after the existing window expires", () => {
    const limiter = createRateLimiter({ maxEntries: 1 });
    limiter.enforce({ key: "expired", limit: 2, windowMs: 1000, now: 0 });

    expect(() => limiter.enforce({ key: "replacement", limit: 2, windowMs: 1000, now: 1000 })).not.toThrow();
    expect(limiter.size()).toBe(1);
  });

  it("atomically reserves available attempts and rejects the next one", () => {
    const limiter = createRateLimiter({ maxEntries: 2 });
    const input = { key: "login:EMP001:ip", limit: 2, windowMs: 1000, now: 0 };

    limiter.reserveAttempt(input);
    limiter.reserveAttempt({ ...input, now: 1 });

    expect(() => limiter.reserveAttempt({ ...input, now: 2 }))
      .toThrowError(expect.objectContaining({ code: "RATE_LIMITED" }));
  });

  it("sweeps expired windows through its testable API", () => {
    const limiter = createRateLimiter({ maxEntries: 2 });
    limiter.enforce({ key: "expired", limit: 2, windowMs: 1000, now: 0 });
    limiter.enforce({ key: "live", limit: 2, windowMs: 2000, now: 500 });

    expect(limiter.sweepExpired(1000)).toBe(1);
    expect(limiter.size()).toBe(1);
  });

  it("can clear a failure window after a successful operation", () => {
    const limiter = createRateLimiter({ maxEntries: 2 });
    limiter.enforce({ key: "login:EMP001:ip", limit: 1, windowMs: 1000, now: 0 });

    limiter.clear("login:EMP001:ip");

    expect(() => limiter.enforce({ key: "login:EMP001:ip", limit: 1, windowMs: 1000, now: 1 })).not.toThrow();
  });
});
