import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../route";

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
  });

  afterEach(() => {
    mockFetch.mockReset();
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
    expect(init.headers["User-Agent"]).toContain("Nutria");
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

  it("throttles a burst from one client", async () => {
    mockFetch.mockResolvedValue(okResponse({ hits: [] }));

    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        GET(
          createRequest(
            `http://localhost/api/foodfacts/search?q=burst-${index}`,
          ),
        ),
      ),
    );

    expect(responses.some((response) => response.status === 429)).toBe(true);
  });
});
