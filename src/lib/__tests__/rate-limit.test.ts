import { describe, expect, test } from "vitest";

import { RateLimiter } from "@/lib/rate-limit";

/** A limiter on a hand-driven clock, plus the means to move that clock. */
function setup(options: { perMinute?: number; maxKeys?: number } = {}) {
  let time = 1_000;
  const limiter = new RateLimiter({
    perMinute: options.perMinute ?? 3,
    maxKeys: options.maxKeys ?? 10,
    now: () => time,
  });

  return {
    limiter,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe("RateLimiter", () => {
  test("allows a burst up to the per-minute allowance", () => {
    const { limiter } = setup({ perMinute: 3 });

    expect(limiter.take("a")).toEqual({ allowed: true });
    expect(limiter.take("a")).toEqual({ allowed: true });
    expect(limiter.take("a")).toEqual({ allowed: true });
    expect(limiter.take("a").allowed).toBe(false);
  });

  test("advertises how long until the next token", () => {
    const { limiter } = setup({ perMinute: 3 });
    for (let index = 0; index < 3; index++) limiter.take("a");

    // One token every 20 s.
    expect(limiter.take("a")).toEqual({
      allowed: false,
      retryAfterSeconds: 20,
    });
  });

  test("advertises at least one second", () => {
    const { limiter, advance } = setup({ perMinute: 60 });
    for (let index = 0; index < 60; index++) limiter.take("a");
    advance(999);

    expect(limiter.take("a")).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
    });
  });

  test("refills continuously", () => {
    const { limiter, advance } = setup({ perMinute: 3 });
    for (let index = 0; index < 3; index++) limiter.take("a");

    advance(20_000);

    expect(limiter.take("a").allowed).toBe(true);
    expect(limiter.take("a").allowed).toBe(false);
  });

  test("never refills past the allowance", () => {
    const { limiter, advance } = setup({ perMinute: 2 });
    advance(10 * 60_000);

    expect(limiter.take("a").allowed).toBe(true);
    expect(limiter.take("a").allowed).toBe(true);
    expect(limiter.take("a").allowed).toBe(false);
  });

  test("keeps each key's allowance separate", () => {
    const { limiter } = setup({ perMinute: 1 });
    limiter.take("a");

    expect(limiter.take("a").allowed).toBe(false);
    expect(limiter.take("b").allowed).toBe(true);
  });

  test("forgets the least recently used key past the cap", () => {
    const { limiter } = setup({ perMinute: 1, maxKeys: 2 });
    limiter.take("a");
    limiter.take("b");
    // Touching `a` makes `b` the least recently used.
    limiter.take("a");

    limiter.take("c");

    expect(limiter.size).toBe(2);
    // `a` is still tracked, and still spent.
    expect(limiter.take("a").allowed).toBe(false);
  });

  test("stays within the cap however many distinct keys it is fed", () => {
    const { limiter } = setup({ maxKeys: 5 });

    for (let index = 0; index < 1_000; index++) limiter.take(`k${index}`);

    expect(limiter.size).toBe(5);
  });

  test.each([0, -1, Number.NaN])("rejects a perMinute of %s", (perMinute) => {
    expect(() => new RateLimiter({ perMinute, maxKeys: 1 })).toThrow(
      RangeError,
    );
  });

  test.each([0, -1, 1.5, Number.NaN])("rejects a maxKeys of %s", (maxKeys) => {
    expect(() => new RateLimiter({ perMinute: 1, maxKeys })).toThrow(
      RangeError,
    );
  });

  test("uses the system clock by default", () => {
    const limiter = new RateLimiter({ perMinute: 1, maxKeys: 1 });

    expect(limiter.take("a").allowed).toBe(true);
    expect(limiter.take("a").allowed).toBe(false);
  });
});
