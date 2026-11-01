import { PCT_TOLERANCE } from "./schema";

/**
 * Geometry for the goals form's stacked day bar: one segment per meal, in the
 * order the meals are eaten. Pure math with no I/O, so the client form can
 * recompute the bar on every keystroke.
 */

/**
 * Opacity of the faintest segment. Keeping a floor means the first meal still
 * reads against the card instead of blending into the track.
 */
export const MIN_SEGMENT_OPACITY = 0.25;

/** One meal's segment in the stacked day bar. */
export type SplitSegment = {
  /** Width as a percentage of the bar's track, 0–100. */
  widthPercent: number;
  /** Opacity of the primary colour, {@link MIN_SEGMENT_OPACITY}–1. */
  opacity: number;
};

/**
 * Turns the entered meal shares into the stacked bar's segments, in the order
 * the shares were given.
 *
 * Each share is clamped to 0–100. A day that does not add up to 100 draws only
 * that much of the track, leaving the rest empty — the same gap the save-time
 * sum check rejects. A total above 100 (reachable only mid-edit, because the
 * schema refuses to save one) is scaled back, so the bar never overflows and no
 * segment is squeezed by its siblings.
 *
 * Every segment is the same primary colour, so the tint has to carry the dining
 * order: opacity ramps from {@link MIN_SEGMENT_OPACITY} on the first meal to
 * full strength on the last. That also follows the theme — in dark mode the
 * primary is the light colour, so the last meal stays the strongest step
 * against the card instead of the faintest.
 *
 * @param shares Each meal's share of the day, in dining order.
 * @returns One segment per share, in the same order.
 */
export function daySplitSegments(shares: number[]): SplitSegment[] {
  const clamped = shares.map((share) =>
    Math.min(100, Math.max(0, Number.isFinite(share) ? share : 0)),
  );
  const total = clamped.reduce((sum, share) => sum + share, 0);
  const scale = total > 100 ? 100 / total : 1;
  const steps = clamped.length - 1;

  return clamped.map((share, index) => ({
    widthPercent: share * scale,
    opacity:
      steps < 1
        ? 1
        : MIN_SEGMENT_OPACITY + ((1 - MIN_SEGMENT_OPACITY) * index) / steps,
  }));
}

/**
 * Where the 100% mark falls on a bar whose shares run over and were scaled back
 * to fit. Without this mark an over-allocated bar looks as full as a valid one.
 *
 * @param shares The entered shares; each is clamped to 0–100, as in the bar.
 * @returns The mark's position as a percentage of the track, or `null` when the
 * total is within the save-time tolerance of 100 or below it.
 */
export function overLimitPosition(shares: number[]): number | null {
  const total = shares.reduce(
    (sum, share) =>
      sum + Math.min(100, Math.max(0, Number.isFinite(share) ? share : 0)),
    0,
  );

  return total > 100 + PCT_TOLERANCE ? (100 / total) * 100 : null;
}
