/** Options for a {@link RateLimiter}. */
export interface RateLimiterOptions {
  /** Requests one key may make per minute; also the burst it may make at once. */
  perMinute: number;
  /**
   * Most keys tracked at once. Past it, the least recently used key is
   * forgotten (and starts over with a full allowance), so the memory a limiter
   * can take is bounded whatever keys it is fed.
   */
  maxKeys: number;
  /** Clock, in ms since the epoch. Injectable for tests. */
  now?: () => number;
}

/** Outcome of {@link RateLimiter.take}. */
export type RateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      /** Seconds to advertise in `Retry-After`, at least 1. */
      retryAfterSeconds: number;
    };

/**
 * Per-key token-bucket rate limiter. Each key holds up to `perMinute` tokens
 * that refill continuously, so a client that paces itself never waits while
 * a burst is capped.
 */
export class RateLimiter {
  private readonly buckets = new Map<
    string,
    { tokens: number; lastRefill: number }
  >();
  private readonly capacity: number;
  /** Time it takes one token to refill. */
  private readonly msPerToken: number;
  private readonly maxKeys: number;
  private readonly now: () => number;

  /**
   * @param options Allowance, key cap and clock.
   * @throws {RangeError} If `perMinute` is not positive or `maxKeys` is not a
   * positive integer.
   */
  constructor({ perMinute, maxKeys, now = Date.now }: RateLimiterOptions) {
    if (!(perMinute > 0)) throw new RangeError("perMinute must be positive.");
    if (!Number.isInteger(maxKeys) || maxKeys < 1) {
      throw new RangeError("maxKeys must be a positive integer.");
    }

    this.capacity = perMinute;
    this.msPerToken = 60_000 / perMinute;
    this.maxKeys = maxKeys;
    this.now = now;
  }

  /** Number of keys currently tracked. */
  get size(): number {
    return this.buckets.size;
  }

  /**
   * Spends one token from `key`'s bucket when one is available.
   *
   * @param key Identity the allowance belongs to, e.g. a user id.
   * @returns Whether the request is within the limit and, when it is not,
   * how long until it would be.
   */
  take(key: string): RateLimitResult {
    const now = this.now();
    const bucket = this.buckets.get(key) ?? {
      tokens: this.capacity,
      lastRefill: now,
    };

    bucket.tokens = Math.min(
      this.capacity,
      bucket.tokens + (now - bucket.lastRefill) / this.msPerToken,
    );
    bucket.lastRefill = now;

    // Re-insert so the map's order runs from least to most recently used.
    this.buckets.delete(key);
    this.buckets.set(key, bucket);
    while (this.buckets.size > this.maxKeys) {
      const oldest = this.buckets.keys().next().value as string;
      this.buckets.delete(oldest);
    }

    if (bucket.tokens < 1) {
      const missing = 1 - bucket.tokens;
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((missing * this.msPerToken) / 1000),
        ),
      };
    }

    bucket.tokens -= 1;
    return { allowed: true };
  }
}
