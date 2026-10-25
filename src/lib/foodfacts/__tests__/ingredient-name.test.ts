import { describe, expect, it } from "vitest";

import { buildIngredientName } from "../ingredient-name";

describe("buildIngredientName", () => {
  it("appends the brand in parentheses", () => {
    expect(buildIngredientName("Almond Butter", "BrandCo")).toBe(
      "Almond Butter (BrandCo)",
    );
  });

  it("trims the name and brand", () => {
    expect(buildIngredientName("  Almond Butter ", " BrandCo ")).toBe(
      "Almond Butter (BrandCo)",
    );
  });

  it("returns the name alone without a brand", () => {
    expect(buildIngredientName("Almond Butter")).toBe("Almond Butter");
    expect(buildIngredientName("Almond Butter", null)).toBe("Almond Butter");
    expect(buildIngredientName("Almond Butter", "  ")).toBe("Almond Butter");
  });

  it("skips a brand equal to the name, ignoring case", () => {
    expect(buildIngredientName("Nutella", "nutella")).toBe("Nutella");
  });

  it("skips a brand already contained in the name", () => {
    expect(buildIngredientName("BrandCo Almond Butter", "BrandCo")).toBe(
      "BrandCo Almond Butter",
    );
  });

  it("keeps short results untouched at exactly the limit", () => {
    const name = "a".repeat(80);
    expect(buildIngredientName(name)).toBe(name);
  });

  it("shortens a long name with an ellipsis, keeping the brand", () => {
    const result = buildIngredientName("a".repeat(100), "BrandCo");
    expect(result).toHaveLength(80);
    expect(result).toBe(`${"a".repeat(69)}… (BrandCo)`);
  });

  it("drops a brand that would leave too little of the name", () => {
    const result = buildIngredientName("a".repeat(100), "b".repeat(75));
    expect(result).toBe(`${"a".repeat(79)}…`);
  });

  it("shortens a long name without a brand", () => {
    const result = buildIngredientName("a".repeat(120));
    expect(result).toHaveLength(80);
    expect(result.endsWith("…")).toBe(true);
  });

  it("never leaves half an emoji at the cut", () => {
    const result = buildIngredientName(`${"a".repeat(78)}😀😀`);
    expect(result).toBe(`${"a".repeat(78)}…`);
    expect(result).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/);
  });
});
