import { describe, expect, test } from "vitest";

import { formatMacro } from "@/lib/ingredients/format";

describe("formatMacro", () => {
  test("renders whole numbers without a decimal part", () => {
    expect(formatMacro(165)).toBe("165");
    expect(formatMacro(0)).toBe("0");
    expect(formatMacro(100)).toBe("100");
  });

  test("keeps a single decimal for fractional values", () => {
    expect(formatMacro(31.5)).toBe("31.5");
    expect(formatMacro(0.4)).toBe("0.4");
    expect(formatMacro(99.9)).toBe("99.9");
  });

  test("rounds to one decimal place", () => {
    expect(formatMacro(12.34)).toBe("12.3");
    expect(formatMacro(12.66)).toBe("12.7");
  });
});
