import { describe, expect, test } from "vitest";

import { daySplitSegments, MIN_SEGMENT_OPACITY } from "@/lib/goals/day-split";

/** The segment widths of a share list, for terse assertions. */
const widths = (shares: number[]) =>
  daySplitSegments(shares).map((segment) => segment.widthPercent);

/** The segment opacities of a share list, for terse assertions. */
const opacities = (shares: number[]) =>
  daySplitSegments(shares).map((segment) => segment.opacity);

describe("daySplitSegments", () => {
  test("draws each share as its own width, in dining order", () => {
    expect(widths([20, 30, 50])).toEqual([20, 30, 50]);
  });

  test("keeps a share wider than its siblings wider on screen", () => {
    // The point of the bar: dinner at half the day is visibly half of it.
    const [breakfast, , dinner] = widths([20, 30, 50]);

    expect(dinner).toBeGreaterThan(breakfast);
    expect(dinner).toBe(50);
  });

  test("rams the opacity from faintest first meal to full-strength last", () => {
    expect(opacities([20, 30, 50])).toEqual([0.25, 0.625, 1]);
  });

  test("gives a single meal the full-strength colour", () => {
    expect(daySplitSegments([100])).toEqual([
      { widthPercent: 100, opacity: 1 },
    ]);
  });

  test("spreads the ramp evenly across more meals than the theme has greys", () => {
    const ramp = opacities([12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5]);

    expect(ramp[0]).toBe(MIN_SEGMENT_OPACITY);
    expect(ramp[7]).toBe(1);
    // Each step is the same size, so no two meals share a tint.
    expect(new Set(ramp).size).toBe(8);
    for (let index = 1; index < ramp.length; index += 1) {
      expect(ramp[index] - ramp[index - 1]).toBeCloseTo(0.75 / 7);
    }
  });

  test("leaves the track empty when the shares fall short of 100", () => {
    // 20 + 30 + 20 = 70: the unclaimed 30% stays as bare track, which is the
    // gap the save-time sum check rejects.
    expect(widths([20, 30, 20])).toEqual([20, 30, 20]);
  });

  test("scales the whole bar back when the shares exceed 100", () => {
    // Reachable only mid-edit; proportions survive, the bar never overflows.
    const scaled = widths([40, 40, 40]);

    expect(scaled.reduce((sum, width) => sum + width, 0)).toBeCloseTo(100);
    expect(scaled[0]).toBeCloseTo(33.3333333);
  });

  test("keeps the proportions of a scaled-back bar", () => {
    const [first, second] = widths([25, 50]);

    expect(second).toBeCloseTo(first * 2);
  });

  test("clamps negative and out-of-range shares", () => {
    expect(widths([-10, 400])).toEqual([0, 100]);
  });

  test("treats a non-finite share as empty rather than stretching the bar", () => {
    // `Number("")` is 0 but a stray NaN or Infinity must not reach the styles.
    expect(widths([Number.NaN, Number.POSITIVE_INFINITY, 50])).toEqual([
      0, 0, 50,
    ]);
  });

  test("draws nothing for a day with no meals", () => {
    expect(daySplitSegments([])).toEqual([]);
  });
});
