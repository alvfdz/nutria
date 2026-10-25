import { describe, expect, it } from "vitest";

import {
  extractBrand,
  extractProductName,
  mapProduct,
  mapSearchResponse,
  normalizeImageUrl,
  normalizeMacros,
  toNumber,
  type OffProduct,
} from "../mapping";

describe("toNumber", () => {
  it("handles null and undefined", () => {
    expect(toNumber(null)).toBeNull();
    expect(toNumber(undefined)).toBeNull();
  });

  it("handles finite numbers", () => {
    expect(toNumber(5)).toBe(5);
    expect(toNumber(0)).toBe(0);
  });

  it("parses numeric strings", () => {
    expect(toNumber("10.5")).toBe(10.5);
    expect(toNumber("0")).toBe(0);
  });

  it("rejects non-numeric values", () => {
    expect(toNumber("abc")).toBeNull();
    expect(toNumber(Number.NaN)).toBeNull();
    expect(toNumber(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("extractProductName", () => {
  it("prefers product_name", () => {
    expect(extractProductName({ product_name: "Almond Butter" })).toBe(
      "Almond Butter",
    );
  });

  it("falls back to generic_name", () => {
    expect(extractProductName({ generic_name: "Nut butter" })).toBe(
      "Nut butter",
    );
  });

  it("trims whitespace", () => {
    expect(extractProductName({ product_name: "  Almond  " })).toBe("Almond");
  });

  it("defaults when missing", () => {
    expect(extractProductName({})).toBe("Unknown product");
    expect(extractProductName({ product_name: "   " })).toBe("Unknown product");
  });
});

describe("extractBrand", () => {
  it("reads the string form", () => {
    expect(extractBrand({ brands: "BrandCo" })).toBe("BrandCo");
    expect(extractBrand({ brands: "  BrandCo  " })).toBe("BrandCo");
  });

  it("reads the array form, which the search API returns", () => {
    expect(extractBrand({ brands: ["Jumbo"] })).toBe("Jumbo");
    expect(extractBrand({ brands: ["A", "B"] })).toBe("A, B");
  });

  it("drops empty entries", () => {
    expect(extractBrand({ brands: [" ", "B"] })).toBe("B");
    expect(extractBrand({ brands: [] })).toBeUndefined();
  });

  it("falls back to brands_tags", () => {
    expect(extractBrand({ brands_tags: ["A", "B"] })).toBe("A, B");
  });

  it("returns undefined when missing", () => {
    expect(extractBrand({})).toBeUndefined();
    expect(extractBrand({ brands: "   " })).toBeUndefined();
    expect(extractBrand({ brands_tags: [] })).toBeUndefined();
  });
});

describe("normalizeMacros", () => {
  it("normalizes a full nutriments object", () => {
    const result = normalizeMacros({
      "energy-kcal_100g": 567,
      proteins_100g: 21.2,
      carbohydrates_100g: 18.7,
      fat_100g: 49.4,
      fiber_100g: 12.5,
      sugars_100g: 4.7,
      sodium_100g: 0.01,
    });

    expect(result.caloriesPer100g).toBe(567);
    expect(result.proteinPer100g).toBe(21.2);
    expect(result.carbsPer100g).toBe(18.7);
    expect(result.fatPer100g).toBe(49.4);
    expect(result.fiberPer100g).toBe(12.5);
    expect(result.sugarPer100g).toBe(4.7);
    expect(result.sodiumPer100g).toBe(0.01);
  });

  it("derives kcal from kJ when kcal is missing", () => {
    const result = normalizeMacros({ "energy-kj_100g": 2364 });

    expect(result.caloriesPer100g).toBeCloseTo(565, 0);
    expect(result.energyKcalPer100g).toBeNull();
    expect(result.energyKjPer100g).toBe(2364);
  });

  it("prefers kcal when both are present", () => {
    const result = normalizeMacros({
      "energy-kcal_100g": 567,
      "energy-kj_100g": 2364,
    });

    expect(result.caloriesPer100g).toBe(567);
  });

  it("treats salt as sodium when sodium is missing", () => {
    expect(normalizeMacros({ salt_100g: 0.5 }).sodiumPer100g).toBe(0.5);
  });

  it("returns null for missing values", () => {
    const result = normalizeMacros({});

    for (const value of Object.values(result)) {
      expect(value).toBeNull();
    }
  });

  it("parses string values", () => {
    const result = normalizeMacros({
      "energy-kcal_100g": "567",
      proteins_100g: "21.2",
    });

    expect(result.caloriesPer100g).toBe(567);
    expect(result.proteinPer100g).toBe(21.2);
  });
});

describe("mapProduct", () => {
  it("maps a valid product", () => {
    const result = mapProduct({
      code: "12345",
      product_name: "Test Product",
      brands: ["TestBrand"],
      nutriments: { "energy-kcal_100g": 100, proteins_100g: 10 },
    });

    expect(result).toEqual({
      code: "12345",
      productName: "Test Product",
      brand: "TestBrand",
      macrosPer100g: expect.objectContaining({
        caloriesPer100g: 100,
        proteinPer100g: 10,
      }),
    });
  });

  it("maps the thumbnail URL, ignoring blank ones", () => {
    const thumb = (image_thumb_url?: string) =>
      mapProduct({ code: "1", image_thumb_url })?.imageUrl;

    expect(thumb(" https://images.openfoodfacts.org/x.jpg ")).toBe(
      "https://images.openfoodfacts.org/x.jpg",
    );
    expect(thumb("  ")).toBeUndefined();
    expect(thumb()).toBeUndefined();
    expect(thumb("http://images.openfoodfacts.org/x.jpg")).toBe(
      "https://images.openfoodfacts.org/x.jpg",
    );
    expect(thumb("javascript:alert(1)")).toBeUndefined();
    expect(thumb("not a url")).toBeUndefined();
  });

  it("accepts OpenFoodFacts domains and their subdomains", () => {
    expect(normalizeImageUrl("https://openfoodfacts.org/x.jpg")).toBe(
      "https://openfoodfacts.org/x.jpg",
    );
    expect(normalizeImageUrl("https://static.openfoodfacts.net/x.jpg")).toBe(
      "https://static.openfoodfacts.net/x.jpg",
    );
  });

  it("drops a non-default http port when upgrading to https", () => {
    expect(
      normalizeImageUrl("http://images.openfoodfacts.org:8080/x.jpg"),
    ).toBe("https://images.openfoodfacts.org/x.jpg");
  });

  it("rejects image hosts outside OpenFoodFacts", () => {
    expect(normalizeImageUrl("https://img.test/x.jpg")).toBeUndefined();
    expect(
      normalizeImageUrl("https://evilopenfoodfacts.org/x.jpg"),
    ).toBeUndefined();
    expect(
      normalizeImageUrl("https://openfoodfacts.org.evil.com/x.jpg"),
    ).toBeUndefined();
    expect(
      normalizeImageUrl("https://evil.com/?h=images.openfoodfacts.org"),
    ).toBeUndefined();
  });

  it("returns null when the product has no code", () => {
    expect(mapProduct({ product_name: "Test" })).toBeNull();
  });

  it("returns null for a falsy product", () => {
    expect(mapProduct(null as unknown as OffProduct)).toBeNull();
    expect(mapProduct(undefined as unknown as OffProduct)).toBeNull();
  });

  it("tolerates missing name and brand", () => {
    expect(mapProduct({ code: "1" })).toEqual({
      code: "1",
      productName: "Unknown product",
      brand: undefined,
      macrosPer100g: expect.objectContaining({ caloriesPer100g: null }),
    });
  });
});

describe("mapSearchResponse", () => {
  it("maps hits and pagination from the search API", () => {
    const response = mapSearchResponse(
      {
        hits: [
          { code: "1", product_name: "One", brands: ["A"] },
          { code: "2", product_name: "Two" },
        ],
        count: 100,
        page: 2,
        page_size: 2,
        page_count: 50,
      },
      2,
      2,
    );

    expect(response.results).toHaveLength(2);
    expect(response.count).toBe(100);
    expect(response.page).toBe(2);
    expect(response.pageSize).toBe(2);
    expect(response.pages).toBe(50);
  });

  it("derives the page count from the total when the API omits it", () => {
    const response = mapSearchResponse({ hits: [], count: 101 }, 1, 20);

    expect(response.pages).toBe(6);
  });

  it("leaves the page count unknown without a total", () => {
    expect(mapSearchResponse({ hits: [] }, 1, 20).pages).toBeUndefined();
  });

  it("drops hits without a code", () => {
    const response = mapSearchResponse(
      { hits: [{ product_name: "No code" }, { code: "1" }] },
      1,
      20,
    );

    expect(response.results).toHaveLength(1);
    expect(response.results[0].code).toBe("1");
  });

  it("falls back to the requested pagination", () => {
    const response = mapSearchResponse({}, 3, 15);

    expect(response.results).toEqual([]);
    expect(response.page).toBe(3);
    expect(response.pageSize).toBe(15);
  });
});
