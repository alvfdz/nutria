/**
 * The subset of a product that the OpenFoodFacts search API returns for the
 * `fields` this app requests. Everything is optional because a crowd sourced
 * record can be missing any of it, and because callers can ask for less.
 */
export interface OffProduct {
  /** Barcode of the product, used as its stable id. */
  code?: string;
  /** Display name, preferred over `generic_name`. */
  product_name?: string;
  /** Generic name, used when `product_name` is absent. */
  generic_name?: string;
  /** Brand names; the search API returns an array, other APIs a string. */
  brands?: string | string[];
  /** Brand slugs, concatenated when `brands` is absent. */
  brands_tags?: string[];
  /** Thumbnail URL (100 px) of the product picture. */
  image_thumb_url?: string;
  /** Nutrition object whose keys carry their own per-100 g semantics. */
  nutriments?: Record<string, unknown>;
}

/** The Search-a-licious response envelope around the matched products. */
export interface OffSearchResponse {
  /** Products matching the query, already ordered by the API. */
  hits?: OffProduct[];
  /** Total number of matches, capped by the API. */
  count?: number;
  /** Page returned, 1-based. */
  page?: number;
  /** Size of the page returned. */
  page_size?: number;
  /** Total number of pages available. */
  page_count?: number;
}

/**
 * One OpenFoodFacts product as this app consumes it, with the macros shown per
 * 100 g. Nulls mark values OpenFoodFacts does not have, so the UI can show them
 * as "N/A" instead of as zero.
 */
export interface FoodfactsSearchResult {
  /** Barcode of the source product, unique within a result list. */
  code: string;
  /** Display name, `product_name` preferred over `generic_name`. */
  productName: string;
  /** Brand names, when the product has any. */
  brand?: string;
  /** Thumbnail URL for recognizing the product; shown in search, never stored. */
  imageUrl?: string;
  /** Nutrition reported per 100 g of product. */
  macrosPer100g: {
    /** Energy in kcal per 100 g, derived from kJ when kcal is unavailable. */
    caloriesPer100g: number | null;
    /** Protein in grams per 100 g. */
    proteinPer100g: number | null;
    /** Available carbohydrates in grams per 100 g. */
    carbsPer100g: number | null;
    /** Fat in grams per 100 g. */
    fatPer100g: number | null;
    /** Dietary fiber in grams per 100 g. */
    fiberPer100g: number | null;
    /** Sugars in grams per 100 g. */
    sugarPer100g: number | null;
    /** Sodium in grams per 100 g, falling back to salt when absent. */
    sodiumPer100g: number | null;
    /** Raw kcal per 100 g, before any derivation from kJ. */
    energyKcalPer100g: number | null;
    /** Raw kJ per 100 g as reported. */
    energyKjPer100g: number | null;
  };
}

/** The shape this app's search endpoint returns to the browser. */
export interface FoodfactsSearchResponse {
  /** Mapped products, with invalid rows dropped. */
  results: FoodfactsSearchResult[];
  /** Total products matching the query, as reported by OpenFoodFacts. */
  count?: number;
  /** The page returned, 1-based. */
  page?: number;
  /** Size of the returned page. */
  pageSize?: number;
  /** Total number of pages for the query. */
  pages?: number;
}

/**
 * Converts a loosely typed API value into a number, so string numbers from
 * OpenFoodFacts behave like the numeric ones.
 *
 * @param value Value to convert.
 * @returns The finite number, or `null` when it is missing or not numeric.
 */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * Reads the brands of a product in the one shape this app uses, tolerating the
 * string and array forms the different OpenFoodFacts APIs return.
 *
 * @param product Product from OpenFoodFacts.
 * @returns Comma-joined brands, or `undefined` when it has none.
 */
export function extractBrand(product: OffProduct): string | undefined {
  const brands = Array.isArray(product.brands)
    ? product.brands
    : product.brands !== undefined
      ? [product.brands]
      : [];

  const names = brands
    .map((brand) => brand.trim())
    .filter((brand) => brand !== "");

  if (names.length > 0) return names.join(", ");

  if (product.brands_tags && product.brands_tags.length > 0) {
    return product.brands_tags.join(", ");
  }

  return undefined;
}

/**
 * Reads the display name of a product, preferring the product name over the
 * generic one.
 *
 * @param product Product from OpenFoodFacts.
 * @returns The trimmed name, or `"Unknown product"` when neither is set.
 */
export function extractProductName(product: OffProduct): string {
  if (product.product_name && product.product_name.trim()) {
    return product.product_name.trim();
  }
  if (product.generic_name && product.generic_name.trim()) {
    return product.generic_name.trim();
  }
  return "Unknown product";
}

/**
 * Normalizes the nutriments of a product into the per-100 g macros this app
 * stores, deriving kcal from kJ when needed and treating salt as sodium.
 *
 * @param nutriments The `nutriments` object of a product.
 * @returns Every macro, as a number or `null` when not reported.
 */
export function normalizeMacros(
  nutriments: Record<string, unknown> | undefined,
): FoodfactsSearchResult["macrosPer100g"] {
  const calories = toNumber(
    nutriments?.["energy-kcal_100g"] ?? nutriments?.["energy-kcal"],
  );
  const energyKj = toNumber(
    nutriments?.["energy-kj_100g"] ?? nutriments?.["energy-kj"],
  );
  const protein = toNumber(
    nutriments?.["proteins_100g"] ?? nutriments?.["proteins"],
  );
  const carbs = toNumber(
    nutriments?.["carbohydrates_100g"] ?? nutriments?.["carbohydrates"],
  );
  const fat = toNumber(nutriments?.["fat_100g"] ?? nutriments?.["fat"]);
  const fiber = toNumber(nutriments?.["fiber_100g"] ?? nutriments?.["fiber"]);
  const sugar = toNumber(nutriments?.["sugars_100g"] ?? nutriments?.["sugars"]);
  const sodium = toNumber(
    nutriments?.["sodium_100g"] ??
      nutriments?.["sodium"] ??
      nutriments?.["salt_100g"] ??
      nutriments?.["salt"],
  );

  return {
    caloriesPer100g: calories ?? (energyKj ? energyKj * 0.239006 : null),
    proteinPer100g: protein,
    carbsPer100g: carbs,
    fatPer100g: fat,
    fiberPer100g: fiber,
    sugarPer100g: sugar,
    sodiumPer100g: sodium,
    energyKcalPer100g: calories,
    energyKjPer100g: energyKj,
  };
}

/**
 * Domains OpenFoodFacts serves product images from, subdomains included.
 * The CSP's `img-src` (`src/lib/security/csp.ts`) is built from this list, so
 * a host added here is also allowed to load.
 */
export const IMAGE_HOST_SUFFIXES: readonly string[] = [
  "openfoodfacts.org",
  "openfoodfacts.net",
];

/**
 * Validates a thumbnail URL, upgrading `http:` to `https:` so the browser never
 * blocks it as mixed content. Only OpenFoodFacts hosts are accepted, so a
 * user-submitted image URL can never make the browser contact another host.
 *
 * @param url Raw thumbnail URL from OpenFoodFacts.
 * @returns The `https:` URL, or `undefined` when missing, not http(s) or
 *   hosted outside OpenFoodFacts.
 */
export function normalizeImageUrl(url: string | undefined): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:") {
      parsed.protocol = "https:";
      // An explicit http port (:8080) would not carry over to TLS.
      parsed.port = "";
    }
    if (parsed.protocol !== "https:") return undefined;
    const host = parsed.hostname;
    const trusted = IMAGE_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
    return trusted ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Maps one raw OpenFoodFacts product onto a search result.
 *
 * @param product The product as returned by the API.
 * @returns The mapped result, or `null` when the product has no barcode.
 */
export function mapProduct(product: OffProduct): FoodfactsSearchResult | null {
  if (!product?.code) return null;

  return {
    code: product.code,
    productName: extractProductName(product),
    brand: extractBrand(product),
    imageUrl: normalizeImageUrl(product.image_thumb_url),
    macrosPer100g: normalizeMacros(product.nutriments),
  };
}

/**
 * Maps a whole OpenFoodFacts search response onto this app's result shape,
 * dropping entries without a barcode and falling back to the requested
 * pagination when the API omits its own.
 *
 * @param offResponse The parsed OpenFoodFacts search response.
 * @param page Requested page, 1-based.
 * @param limit Requested page size.
 * @returns The response to send back to the browser.
 */
export function mapSearchResponse(
  offResponse: OffSearchResponse,
  page: number,
  limit: number,
): FoodfactsSearchResponse {
  const results = (offResponse.hits ?? [])
    .map(mapProduct)
    .filter((result): result is FoodfactsSearchResult => result !== null);

  const pageSize = offResponse.page_size ?? limit;
  // Derive the page count from the total when the API omits it, so clients
  // never have to guess from the (filtered) number of results.
  const pages =
    offResponse.page_count ??
    (offResponse.count !== undefined && pageSize > 0
      ? Math.ceil(offResponse.count / pageSize)
      : undefined);

  return {
    results,
    count: offResponse.count,
    page: offResponse.page ?? page,
    pageSize,
    pages,
  };
}
