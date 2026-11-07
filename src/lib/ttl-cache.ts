/** Options for a {@link TtlCache}. */
export interface TtlCacheOptions {
  /** How long an entry stays readable after it is written, in ms. */
  ttlMs: number;
  /**
   * Most entries held at once. Writing past it evicts the oldest entry, so
   * the memory a cache can take is bounded whatever keys it is fed.
   */
  maxEntries: number;
  /** Clock, in ms since the epoch. Injectable for tests. */
  now?: () => number;
}

/**
 * In-memory cache whose entries expire a fixed time after they are written
 * and whose size is capped.
 *
 * Every entry lives for the same `ttlMs`, and a rewrite moves its key to the
 * end, so the map's insertion order is also its expiry order: expired entries
 * are always at the front and a write sweeps them in time proportional to how
 * many expired, not to the size of the cache.
 *
 * @typeParam V Type of the cached values.
 */
export class TtlCache<V> {
  private readonly entries = new Map<string, { value: V; expires: number }>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;

  /**
   * @param options Lifetime, size cap and clock.
   * @throws {RangeError} If `ttlMs` is not positive or `maxEntries` is not a
   * positive integer.
   */
  constructor({ ttlMs, maxEntries, now = Date.now }: TtlCacheOptions) {
    if (!(ttlMs > 0)) throw new RangeError("ttlMs must be positive.");
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
      throw new RangeError("maxEntries must be a positive integer.");
    }

    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.now = now;
  }

  /** Number of entries held, expired ones not yet swept included. */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Reads a value, dropping it when it has expired.
   *
   * @param key Cache key.
   * @returns The value, or `undefined` when it is missing or expired.
   */
  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    if (entry.expires <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Stores a value for `ttlMs`, sweeping expired entries and evicting the
   * oldest ones while the cache is over `maxEntries`.
   *
   * @param key Cache key.
   * @param value Value to store.
   */
  set(key: string, value: V): void {
    const now = this.now();

    for (const [oldKey, entry] of this.entries) {
      if (entry.expires > now) break;
      this.entries.delete(oldKey);
    }

    // Delete first so a rewrite moves the key to the end of the order.
    this.entries.delete(key);
    this.entries.set(key, { value, expires: now + this.ttlMs });

    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as string;
      this.entries.delete(oldest);
    }
  }
}
