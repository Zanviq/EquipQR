import { beforeEach, describe, expect, it } from "vitest";
import { enforceRateLimit, resetRateLimitsForTest } from "./rate-limit";

describe("rate limiter", () => {
  beforeEach(resetRateLimitsForTest);
  it("rejects excess requests and opens a fresh fixed window", () => {
    enforceRateLimit({ key: "login:ip", limit: 2, windowMs: 1000, now: 0 });
    enforceRateLimit({ key: "login:ip", limit: 2, windowMs: 1000, now: 1 });
    expect(() => enforceRateLimit({ key: "login:ip", limit: 2, windowMs: 1000, now: 2 })).toThrowError(expect.objectContaining({ code: "RATE_LIMITED" }));
    expect(() => enforceRateLimit({ key: "login:ip", limit: 2, windowMs: 1000, now: 1000 })).not.toThrow();
  });
});
