import { describe, expect, test } from "vitest";

import { TtlCache } from "@/lib/ttl-cache";

/** A cache on a hand-driven clock, plus the means to move that clock. */
function setup(options: { ttlMs?: number; maxEntries?: number } = {}) {
  let time = 1_000;
  const cache = new TtlCache<string>({
    ttlMs: options.ttlMs ?? 100,
    maxEntries: options.maxEntries ?? 10,
    now: () => time,
  });

  return {
    cache,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe("TtlCache", () => {
  test("returns a value until it expires", () => {
    const { cache, advance } = setup({ ttlMs: 100 });
    cache.set("a", "one");

    advance(99);
    expect(cache.get("a")).toBe("one");

    advance(1);
    expect(cache.get("a")).toBeUndefined();
  });

  test("returns undefined for a key never written", () => {
    expect(setup().cache.get("missing")).toBeUndefined();
  });

  test("drops an expired entry when it is read", () => {
    const { cache, advance } = setup({ ttlMs: 100 });
    cache.set("a", "one");
    advance(100);

    cache.get("a");

    expect(cache.size).toBe(0);
  });

  test("sweeps expired entries on write, even ones never read again", () => {
    const { cache, advance } = setup({ ttlMs: 100 });
    cache.set("a", "one");
    cache.set("b", "two");
    advance(100);

    cache.set("c", "three");

    expect(cache.size).toBe(1);
    expect(cache.get("c")).toBe("three");
  });

  test("keeps entries that have not expired when sweeping", () => {
    const { cache, advance } = setup({ ttlMs: 100 });
    cache.set("a", "one");
    advance(50);
    cache.set("b", "two");
    advance(50);

    cache.set("c", "three");

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("two");
    expect(cache.size).toBe(2);
  });

  test("evicts the oldest entries past the size cap", () => {
    const { cache } = setup({ maxEntries: 2 });
    cache.set("a", "one");
    cache.set("b", "two");
    cache.set("c", "three");

    expect(cache.size).toBe(2);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("two");
    expect(cache.get("c")).toBe("three");
  });

  test("stays within the cap however many distinct keys it is fed", () => {
    const { cache } = setup({ maxEntries: 5 });

    for (let index = 0; index < 1_000; index++) cache.set(`k${index}`, "v");

    expect(cache.size).toBe(5);
  });

  test("a rewrite renews the lifetime and moves the key to the back", () => {
    const { cache, advance } = setup({ ttlMs: 100, maxEntries: 2 });
    cache.set("a", "one");
    cache.set("b", "two");
    advance(60);
    cache.set("a", "uno");
    advance(60);

    // `b` expired and is swept; `a` was renewed 60 ms ago.
    cache.set("c", "three");

    expect(cache.get("a")).toBe("uno");
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe("three");
  });

  test.each([0, -1, Number.NaN])("rejects a ttlMs of %s", (ttlMs) => {
    expect(() => new TtlCache({ ttlMs, maxEntries: 1 })).toThrow(RangeError);
  });

  test.each([0, -1, 1.5, Number.NaN])("rejects a maxEntries of %s", (max) => {
    expect(() => new TtlCache({ ttlMs: 1, maxEntries: max })).toThrow(
      RangeError,
    );
  });

  test("uses the system clock by default", () => {
    const cache = new TtlCache<number>({ ttlMs: 60_000, maxEntries: 1 });
    cache.set("a", 1);

    expect(cache.get("a")).toBe(1);
  });
});
