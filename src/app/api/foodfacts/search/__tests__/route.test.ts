import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCurrentUser } from "@/lib/auth/session";
import { makeUser, testUser } from "@test/factories";
import { GET } from "../route";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

/**
 * Builds a Next.js request for the route under test.
 *
 * @param url Absolute URL to request.
 * @returns The request instance.
 */
function createRequest(url: string) {
  return new NextRequest(url);
}

/**
 * Builds a successful OpenFoodFacts fetch stub.
 *
 * @param body Response payload.
 * @returns The stubbed `fetch` result.
 */
function okResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => body,
  };
}

describe("GET /api/foodfacts/search", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(getCurrentUser).mockResolvedValue(testUser);
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  it("refuses a request without a valid session before calling upstream", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const res = await GET(
      createRequest("http://localhost/api/foodfacts/search?q=milk"),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: "Sign in to search OpenFoodFacts.",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects a missing query", async () => {
    const res = await GET(
      createRequest("http://localhost/api/foodfacts/search"),
    );

    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects an empty query", async () => {
    const res = await GET(
      createRequest("http://localhost/api/foodfacts/search?q="),
    );

    expect(res.status).toBe(400);
  });

  it("returns mapped results", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse({
        hits: [
          {
            code: "12345",
            product_name: "Almond Butter",
            brands: ["TestBrand"],
            nutriments: {
              "energy-kcal_100g": 567,
              proteins_100g: 21.2,
            },
          },
        ],
        count: 1,
        page: 1,
        page_size: 20,
        page_count: 1,
      }),
    );

    const res = await GET(
      createRequest("http://localhost/api/foodfacts/search?q=almond"),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0]).toMatchObject({
      code: "12345",
      productName: "Almond Butter",
      brand: "TestBrand",
    });
    expect(body.count).toBe(1);
  });

  it("queries the OpenFoodFacts full-text search with a User-Agent", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ hits: [] }));

    await GET(createRequest("http://localhost/api/foodfacts/search?q=chicken"));

    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("https://search.openfoodfacts.org/search");
    expect(String(url)).toContain("q=chicken");
    expect(init.headers["User-Agent"]).toBe(
      "Nutria/0.1.0 (+https://github.com/alvfdz/nutria)",
    );
  });

  it("requests the thumbnail and nutriments fields", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ hits: [] }));

    await GET(createRequest("http://localhost/api/foodfacts/search?q=fields"));

    const url = new URL(String(mockFetch.mock.calls[0][0]));
    const fields = url.searchParams.get("fields")?.split(",");
    expect(fields).toEqual(
      expect.arrayContaining(["code", "image_thumb_url", "nutriments"]),
    );
  });

  it("passes the upstream status through when OpenFoodFacts fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      headers: new Headers(),
      json: async () => ({}),
    });

    const res = await GET(
      createRequest("http://localhost/api/foodfacts/search?q=unavailable"),
    );

    expect(res.status).toBe(503);
  });

  it("passes the upstream Retry-After through", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      headers: new Headers({ "Retry-After": "30" }),
      json: async () => ({}),
    });

    const res = await GET(
      createRequest("http://localhost/api/foodfacts/search?q=busy"),
    );

    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBe("30");
  });

  it("falls back to the first page when the page is not a number", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ hits: [] }));

    await GET(
      createRequest("http://localhost/api/foodfacts/search?q=paged&page=abc"),
    );

    const [url] = mockFetch.mock.calls[0];
    expect(new URL(url).searchParams.get("page")).toBe("1");
  });

  it("returns 500 when the request throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const res = await GET(
      createRequest("http://localhost/api/foodfacts/search?q=test"),
    );

    expect(res.status).toBe(500);
  });

  it("caches identical queries", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ hits: [{ code: "1" }] }));

    const url = "http://localhost/api/foodfacts/search?q=cache";
    await GET(createRequest(url));
    await GET(createRequest(url));

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("rejects a query over 200 characters before calling upstream", async () => {
    const res = await GET(
      createRequest(
        `http://localhost/api/foodfacts/search?q=${"a".repeat(201)}`,
      ),
    );

    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("accepts a query of exactly 200 characters", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ hits: [] }));

    const res = await GET(
      createRequest(
        `http://localhost/api/foodfacts/search?q=${"b".repeat(200)}`,
      ),
    );

    expect(res.status).toBe(200);
  });

  it("says how long a query may be", async () => {
    const res = await GET(
      createRequest(
        `http://localhost/api/foodfacts/search?q=${"c".repeat(201)}`,
      ),
    );

    expect(await res.json()).toEqual({
      error: "Keep the search to 200 characters or fewer.",
    });
  });

  it("shares one upstream call between identical concurrent searches", async () => {
    let respond!: (value: unknown) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        respond = resolve;
      }),
    );
    const url = "http://localhost/api/foodfacts/search?q=shared";

    const first = GET(createRequest(url));
    const second = GET(createRequest(url));
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    respond(okResponse({ hits: [{ code: "9" }] }));
    const responses = await Promise.all([first, second]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const bodies = await Promise.all(responses.map((r) => r.json()));
    expect(bodies[0]).toEqual(bodies[1]);
  });

  it("shares an upstream failure too, and caches nothing", async () => {
    let respond!: (value: unknown) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        respond = resolve;
      }),
    );
    const url = "http://localhost/api/foodfacts/search?q=shared-failure";

    const first = GET(createRequest(url));
    const second = GET(createRequest(url));
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    respond({
      ok: false,
      status: 503,
      headers: new Headers(),
      json: async () => ({}),
    });

    expect((await first).status).toBe(503);
    expect((await second).status).toBe(503);

    mockFetch.mockResolvedValueOnce(okResponse({ hits: [] }));
    expect((await GET(createRequest(url))).status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  // The limiter lives at module scope, so each throttling test spends the
  // allowance of a user of its own.

  it("throttles a burst from one user and says when to retry", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeUser({ id: "burst-user" }));
    mockFetch.mockResolvedValue(okResponse({ hits: [] }));

    const responses = await Promise.all(
      Array.from({ length: 40 }, (_, index) =>
        GET(
          createRequest(
            `http://localhost/api/foodfacts/search?q=burst-${index}`,
          ),
        ),
      ),
    );

    const throttled = responses.filter((response) => response.status === 429);
    expect(throttled).toHaveLength(10);
    expect(Number(throttled[0].headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(mockFetch).toHaveBeenCalledTimes(30);
  });

  it("throttles each user on their own", async () => {
    mockFetch.mockResolvedValue(okResponse({ hits: [] }));
    vi.mocked(getCurrentUser).mockResolvedValue(makeUser({ id: "user-a" }));
    for (let index = 0; index < 31; index++) {
      await GET(
        createRequest(`http://localhost/api/foodfacts/search?q=a-${index}`),
      );
    }

    vi.mocked(getCurrentUser).mockResolvedValue(makeUser({ id: "user-b" }));
    const other = await GET(
      createRequest("http://localhost/api/foodfacts/search?q=b-0"),
    );

    expect(other.status).toBe(200);
  });

  it("ignores a forged X-Forwarded-For when throttling", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeUser({ id: "forger" }));
    mockFetch.mockResolvedValue(okResponse({ hits: [] }));

    const responses = await Promise.all(
      Array.from({ length: 40 }, (_, index) =>
        GET(
          new NextRequest(
            `http://localhost/api/foodfacts/search?q=forged-${index}`,
            { headers: { "x-forwarded-for": `203.0.113.${index}` } },
          ),
        ),
      ),
    );

    expect(responses.some((response) => response.status === 429)).toBe(true);
  });

  it("serves a cached result even once the user is throttled", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeUser({ id: "cached" }));
    mockFetch.mockResolvedValue(okResponse({ hits: [] }));
    const url = "http://localhost/api/foodfacts/search?q=cached-0";
    await GET(createRequest(url));
    for (let index = 1; index <= 30; index++) {
      await GET(
        createRequest(
          `http://localhost/api/foodfacts/search?q=cached-${index}`,
        ),
      );
    }

    const res = await GET(createRequest(url));

    expect(res.status).toBe(200);
  });
});
