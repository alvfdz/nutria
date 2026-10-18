import { NextRequest, NextResponse } from "next/server";

import {
  type FoodfactsSearchResponse,
  mapSearchResponse,
} from "@/lib/foodfacts/mapping";

/**
 * OpenFoodFacts full-text search endpoint (Search-a-licious). The `/api/v2`
 * search only does structured filters, and the legacy `/cgi/search.pl` is
 * discouraged, so full-text search lives here.
 */
const OFF_SEARCH_URL = "https://search.openfoodfacts.org/search";

/** User-Agent OpenFoodFacts asks integrations to send to identify their app. */
const USER_AGENT = "Nutria/1.0 (+https://github.com/nutria/nutria)";

/** Result page size used when the request does not specify one. */
const DEFAULT_LIMIT = 20;

/** Upper bound on `limit`, so one request cannot ask for the whole database. */
const MAX_LIMIT = 50;

/** How long a mapped response stays in the in-memory cache. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Requests one client may issue per minute before being throttled. */
const RATE_LIMIT_PER_MIN = 10;

/** The fields requested from OpenFoodFacts; anything else is dropped upstream. */
const OFF_FIELDS = [
  "code",
  "product_name",
  "generic_name",
  "brands",
  "nutriments",
].join(",");

/** Query results keyed by `query|page|limit`, so repeated searches stay inside the quota. */
const cache = new Map<
  string,
  { data: FoodfactsSearchResponse; expires: number }
>();

/**
 * Per-client token bucket. Tokens refill continuously so a client that paces
 * itself never waits, while a burst is capped.
 */
class TokenBucket {
  /** Tokens currently available. */
  tokens: number;
  /** Timestamp, in ms, of the last refill. */
  lastRefill: number;

  /**
   * @param capacity Tokens held when full.
   * @param refillPerMs Tokens restored per millisecond.
   */
  constructor(
    private capacity: number,
    private refillPerMs: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Restores the tokens accrued since the last call and reports whether one
   * was available, consuming one when so.
   *
   * @returns `true` when the request is within the limit.
   */
  take(): boolean {
    this.tokens = Math.min(
      this.capacity,
      this.tokens + (Date.now() - this.lastRefill) * this.refillPerMs,
    );
    this.lastRefill = Date.now();

    if (this.tokens < 1) return false;

    this.tokens -= 1;
    return true;
  }

  /**
   * Computes how long until a token is available.
   *
   * @returns Seconds to advertise in `Retry-After`, at least 1.
   */
  retryAfterSeconds(): number {
    const missing = 1 - this.tokens;
    return Math.max(1, Math.ceil(missing / this.refillPerMs / 1000));
  }
}

/** Token buckets keyed by client identity. */
const buckets = new Map<string, TokenBucket>();

/**
 * Returns the bucket for a client, creating it on first use.
 *
 * @param key Client identity.
 * @returns That client's token bucket.
 */
function getBucket(key: string): TokenBucket {
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = new TokenBucket(RATE_LIMIT_PER_MIN, RATE_LIMIT_PER_MIN / 60000);
    buckets.set(key, bucket);
  }
  return bucket;
}

/**
 * Derives a client key for rate limiting from the proxy headers.
 *
 * @param req The incoming request.
 * @returns The client address, or `"unknown"` when the header is absent.
 */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "unknown";
}

/**
 * Handles `GET /api/foodfacts/search`. Validates the query, enforces the
 * per-client rate limit, and proxies to OpenFoodFacts with caching so repeated
 * searches do not spend the shared quota.
 *
 * @param req Request carrying `q` (required) and optional `page` and `limit`.
 * @returns The mapped results, or a JSON error with `400`, `429`, or the
 * upstream status.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const page = Math.max(
    1,
    Number.parseInt(searchParams.get("page") ?? "1", 10) || 1,
  );
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Number.parseInt(searchParams.get("limit") ?? "", 10) || DEFAULT_LIMIT,
    ),
  );

  if (!q) {
    return NextResponse.json(
      { error: "A search query is required." },
      { status: 400 },
    );
  }

  const cacheKey = `${q}|${page}|${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const bucket = getBucket(getClientIp(req));
  if (!bucket.take()) {
    return NextResponse.json(
      { error: "Too many searches. Please wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(bucket.retryAfterSeconds()) },
      },
    );
  }

  const params = new URLSearchParams({
    q,
    page: String(page),
    page_size: String(limit),
    fields: OFF_FIELDS,
  });

  try {
    const response = await fetch(`${OFF_SEARCH_URL}?${params}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      // Next.js would otherwise fold this into its own fetch cache; we keep
      // the fresh result and manage freshness with the cache above.
      cache: "no-store",
    });

    if (!response.ok) {
      // 503 is what OpenFoodFacts returns when its own global rate limit is
      // hit; pass the status through so the UI can explain it.
      const retryAfter = response.headers.get("Retry-After");
      return NextResponse.json(
        { error: "OpenFoodFacts is unavailable right now." },
        {
          status: response.status,
          headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
        },
      );
    }

    const mapped = mapSearchResponse(await response.json(), page, limit);
    cache.set(cacheKey, { data: mapped, expires: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Could not reach OpenFoodFacts", error);

    return NextResponse.json(
      { error: "Could not reach OpenFoodFacts. Please try again." },
      { status: 500 },
    );
  }
}
