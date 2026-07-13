import { beforeEach, describe, expect, it } from "vitest";
import {
  createRateLimiter,
  enforceRateLimit,
  LOGIN_RATE_LIMIT_MAX_ENTRIES,
  reserveLoginRateLimitAttempt,
  resetRateLimitsForTest
} from "./rate-limit";

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

  it("does not let a saturated login namespace block application limiter keys", () => {
    for (let index = 0; index < LOGIN_RATE_LIMIT_MAX_ENTRIES; index += 1) {
      reserveLoginRateLimitAttempt({ key: `login-flood:${index}`, limit: 1, windowMs: 1000, now: 0 });
    }

    expect(() => reserveLoginRateLimitAttempt({ key: "login-flood:overflow", limit: 1, windowMs: 1000, now: 1 }))
      .toThrowError(expect.objectContaining({ code: "RATE_LIMITED" }));
    expect(() => enforceRateLimit({ key: "resolve:user:ip", limit: 1, windowMs: 1000, now: 1 })).not.toThrow();
  });

  it("does not repeat a full sweep before the earliest expiry", () => {
    const limiter = createRateLimiter({ maxEntries: 2 });
    limiter.reserveAttempt({ key: "first", limit: 1, windowMs: 1000, now: 0 });
    limiter.reserveAttempt({ key: "second", limit: 1, windowMs: 2000, now: 0 });

    expect(() => limiter.reserveAttempt({ key: "overflow-0", limit: 1, windowMs: 1000, now: 1 }))
      .toThrowError(expect.objectContaining({ code: "RATE_LIMITED" }));
    const sweeps = limiter.fullSweepCountForTest();
    for (let attempt = 1; attempt <= 20; attempt += 1) {
      expect(() => limiter.reserveAttempt({ key: `overflow-${attempt}`, limit: 1, windowMs: 1000, now: attempt + 1 }))
        .toThrowError(expect.objectContaining({ code: "RATE_LIMITED" }));
    }

    expect(limiter.fullSweepCountForTest()).toBe(sweeps);
    expect(() => limiter.reserveAttempt({ key: "after-expiry", limit: 1, windowMs: 1000, now: 1000 })).not.toThrow();
    expect(limiter.fullSweepCountForTest()).toBe(sweeps + 1);
  });
});
