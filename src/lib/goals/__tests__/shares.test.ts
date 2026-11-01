import { describe, expect, test } from "vitest";

import {
  apportion,
  moveBoundary,
  sharesAfterAdding,
  sharesAfterRemoving,
  splitBoundaries,
} from "@/lib/goals/shares";

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe("apportion", () => {
  test("splits evenly, giving the remainder to the earliest items", () => {
    expect(apportion([1, 1, 1])).toEqual([34, 33, 33]);
  });

  test("keeps proportions and sums exactly to the total", () => {
    const result = apportion([30, 40, 30], 75);

    expect(result).toEqual([23, 30, 22]);
    expect(sum(result)).toBe(75);
  });

  test("divides evenly when every weight is zero", () => {
    expect(apportion([0, 0])).toEqual([50, 50]);
  });

  test("counts negative and non-finite weights as zero", () => {
    expect(apportion([-5, Number.NaN, 10])).toEqual([0, 0, 100]);
  });

  test("returns nothing for no weights", () => {
    expect(apportion([])).toEqual([]);
  });
});

describe("sharesAfterAdding", () => {
  test("gives the new meal an even share and keeps the others' proportions", () => {
    expect(sharesAfterAdding([25, 35, 40])).toEqual([19, 26, 30, 25]);
  });

  test("always totals 100, even from an invalid split", () => {
    expect(sum(sharesAfterAdding([80, 40, 30]))).toBe(100);
    expect(sum(sharesAfterAdding([0, 0]))).toBe(100);
  });
});

describe("sharesAfterRemoving", () => {
  test("hands the removed share back in proportion", () => {
    expect(sharesAfterRemoving([25, 35, 40], 2)).toEqual([42, 58]);
  });

  test("gives the last meal the whole day", () => {
    expect(sharesAfterRemoving([60, 40], 0)).toEqual([100]);
  });

  test("returns nothing when no meal remains", () => {
    expect(sharesAfterRemoving([100], 0)).toEqual([]);
  });
});

describe("splitBoundaries", () => {
  test("returns the running total before each divider", () => {
    expect(splitBoundaries([30, 40, 30])).toEqual([30, 70]);
  });

  test("drops floating-point noise", () => {
    expect(splitBoundaries([33.33, 33.33, 33.34])).toEqual([33.33, 66.66]);
  });

  test("has no divider for a single share", () => {
    expect(splitBoundaries([100])).toEqual([]);
  });
});

describe("moveBoundary", () => {
  test("trades share between the two neighbours only", () => {
    expect(moveBoundary([30, 40, 30], 1, 80)).toEqual([30, 50, 20]);
    expect(moveBoundary([30, 40, 30], 0, 20)).toEqual([20, 50, 30]);
  });

  test("stops where a neighbour would go below zero", () => {
    expect(moveBoundary([30, 40, 30], 0, 90)).toEqual([70, 0, 30]);
    expect(moveBoundary([30, 40, 30], 1, 0)).toEqual([30, 0, 70]);
  });

  test("keeps fractional totals intact", () => {
    expect(sum(moveBoundary([33.3, 33.3, 33.4], 0, 40))).toBeCloseTo(100);
  });

  test("ignores an unknown divider", () => {
    expect(moveBoundary([50, 50], 1, 80)).toEqual([50, 50]);
    expect(moveBoundary([50, 50], -1, 80)).toEqual([50, 50]);
  });
});
