import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  type FoodfactsSearchResponse,
  mapSearchResponse,
} from "@/lib/foodfacts/mapping";
import { RateLimiter } from "@/lib/rate-limit";
import { TtlCache } from "@/lib/ttl-cache";
import packageJson from "../../../../../package.json";

/**
 * OpenFoodFacts full-text search endpoint (Search-a-licious). The `/api/v2`
 * search only does structured filters, and the legacy `/cgi/search.pl` is
 * discouraged, so full-text search lives here.
 */
const OFF_SEARCH_URL = "https://search.openfoodfacts.org/search";

/** User-Agent OpenFoodFacts asks integrations to send to identify their app. */
const USER_AGENT = `Nutria/${packageJson.version} (+https://github.com/alvfdz/nutria)`;

/** Result page size used when the request does not specify one. */
const DEFAULT_LIMIT = 20;

/** Upper bound on `limit`, so one request cannot ask for the whole database. */
const MAX_LIMIT = 50;

/** Longest query accepted; also bounds the size of each cache key. */
const MAX_QUERY_LENGTH = 200;

/** How long a mapped response stays in the in-memory cache. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Most responses cached at once. Each holds at most {@link MAX_LIMIT} mapped
 * products, so the cache stays in the low megabytes however many distinct
 * queries arrive.
 */
const CACHE_MAX_ENTRIES = 500;

/** Searches one user may run per minute before being throttled. */
const RATE_LIMIT_PER_MIN = 30;

/** Most users the limiter tracks at once; far above a single-owner instance. */
const RATE_LIMIT_MAX_KEYS = 1000;

/** The fields requested from OpenFoodFacts; anything else is dropped upstream. */
const OFF_FIELDS = [
  "code",
  "product_name",
  "generic_name",
  "brands",
  "image_thumb_url",
  "nutriments",
].join(",");

/** Query results keyed by `query|page|limit`, so repeated searches stay inside the quota. */
const cache = new TtlCache<FoodfactsSearchResponse>({
  ttlMs: CACHE_TTL_MS,
  maxEntries: CACHE_MAX_ENTRIES,
});

/**
 * Upstream searches allowed per signed-in user. Keyed by the user rather than
 * the client address: the route already requires a session, and the address
 * would come from `X-Forwarded-For`, which a client can forge.
 */
const limiter = new RateLimiter({
  perMinute: RATE_LIMIT_PER_MIN,
  maxKeys: RATE_LIMIT_MAX_KEYS,
});

/** What one upstream search came back with. */
type UpstreamResult =
  | { kind: "ok"; data: FoodfactsSearchResponse }
  | { kind: "unavailable"; status: number; retryAfter: string | null }
  | { kind: "unreachable" };

/**
 * Searches in flight, keyed like {@link cache}. Every request for a key that
 * is already being fetched waits on the same promise. Entries are removed as
 * soon as the fetch settles, so the map only ever holds live requests.
 */
const pending = new Map<string, Promise<UpstreamResult>>();

/**
 * Runs one full-text search against OpenFoodFacts.
 *
 * @param q The query, already validated.
 * @param page Result page, from 1.
 * @param limit Results per page.
 * @returns The mapped results, the upstream status when OpenFoodFacts
 * refused, or `unreachable` when the request itself failed. Never rejects.
 */
async function searchUpstream(
  q: string,
  page: number,
  limit: number,
): Promise<UpstreamResult> {
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
      return {
        kind: "unavailable",
        status: response.status,
        retryAfter: response.headers.get("Retry-After"),
      };
    }

    return {
      kind: "ok",
      data: mapSearchResponse(await response.json(), page, limit),
    };
  } catch (error) {
    console.error("Could not reach OpenFoodFacts", error);
    return { kind: "unreachable" };
  }
}

/**
 * Turns an upstream result into the route's response. A fresh `Response` is
 * built per call, so requests sharing one in-flight search each get their
 * own.
 *
 * @param result What the upstream search came back with.
 * @returns The mapped results, or a JSON error with the upstream status
 * (503 is what OpenFoodFacts returns when its own global rate limit is hit,
 * so the UI can explain it) or `500` when OpenFoodFacts could not be reached.
 */
function toResponse(result: UpstreamResult): NextResponse {
  switch (result.kind) {
    case "ok":
      return NextResponse.json(result.data);
    case "unavailable":
      return NextResponse.json(
        { error: "OpenFoodFacts is unavailable right now." },
        {
          status: result.status,
          headers: result.retryAfter
            ? { "Retry-After": result.retryAfter }
            : undefined,
        },
      );
    case "unreachable":
      return NextResponse.json(
        { error: "Could not reach OpenFoodFacts. Please try again." },
        { status: 500 },
      );
  }
}

/**
 * Handles `GET /api/foodfacts/search`. Requires a signed-in user, validates
 * the query, enforces the per-user rate limit, and proxies to OpenFoodFacts
 * with caching, and with identical concurrent searches sharing one upstream
 * call, so repeated searches do not spend the shared quota.
 *
 * @param req Request carrying `q` (required) and optional `page` and `limit`.
 * @returns The mapped results, or a JSON error with `401`, `400` (missing or
 * over-long query), `429`, or
 * the upstream status.
 */
export async function GET(req: NextRequest) {
  // `src/proxy.ts` only checks that a session cookie is present; this is the
  // check that the session is actually valid.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to search OpenFoodFacts." },
      { status: 401 },
    );
  }

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

  if (q.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Keep the search to ${MAX_QUERY_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const cacheKey = `${q}|${page}|${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  // An identical search already on its way upstream answers this one too,
  // without spending another token or another OpenFoodFacts call.
  const inFlight = pending.get(cacheKey);
  if (inFlight) return toResponse(await inFlight);

  const throttle = limiter.take(user.id);
  if (!throttle.allowed) {
    return NextResponse.json(
      { error: "Too many searches. Please wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(throttle.retryAfterSeconds) },
      },
    );
  }

  const search = searchUpstream(q, page, limit).then((result) => {
    if (result.kind === "ok") cache.set(cacheKey, result.data);
    return result;
  });
  pending.set(cacheKey, search);

  try {
    return toResponse(await search);
  } finally {
    pending.delete(cacheKey);
  }
}
