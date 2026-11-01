/**
 * Pure math for dividing 100% between a list of items, such as macros or meals.
 * The form recalculates with these on every interaction, and they never produce
 * a split the save-time sum check would refuse.
 */

/** Sum of a list of shares. */
const sumOf = (shares: number[]) =>
  shares.reduce((sum, share) => sum + share, 0);

/** Rounds to two decimals, which drops floating-point leftovers. */
const toHundredths = (value: number) => Math.round(value * 100) / 100;

/**
 * Divides a whole-number total in proportion to `weights`, using the largest
 * remainder method so the result is whole numbers that sum exactly to `total`.
 * Ties go to the earliest item. Negative or non-finite weights count as 0, and
 * when no weight is left the total is divided evenly.
 *
 * @param weights The relative size of each item.
 * @param total The whole number to divide.
 * @returns One whole number per weight, summing to `total`; empty for no weights.
 */
export function apportion(weights: number[], total = 100): number[] {
  const clean = weights.map((weight) =>
    Number.isFinite(weight) && weight > 0 ? weight : 0,
  );
  const weightSum = sumOf(clean);
  const effective = weightSum > 0 ? clean : clean.map(() => 1);
  const effectiveSum = sumOf(effective);

  const exact = effective.map((weight) => (weight * total) / effectiveSum);
  const result = exact.map(Math.floor);
  const leftover = total - sumOf(result);

  exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
    .slice(0, leftover)
    .forEach(({ index }) => {
      result[index] += 1;
    });

  return result;
}

/**
 * Makes room for one more meal. The new meal gets an even share of the day and
 * the existing meals shrink in proportion, so their relative sizes survive.
 *
 * @param shares The current share of each meal.
 * @returns One share per existing meal plus the new meal's last, summing to 100.
 */
export function sharesAfterAdding(shares: number[]): number[] {
  const added = Math.round(100 / (shares.length + 1));

  return [...apportion(shares, 100 - added), added];
}

/**
 * Hands a removed meal's share back to the others, in proportion to their sizes.
 *
 * @param shares The current share of each meal, including the removed one.
 * @param index Position of the meal being removed.
 * @returns One share per remaining meal, summing to 100; empty if none remain.
 */
export function sharesAfterRemoving(shares: number[], index: number): number[] {
  return apportion(shares.filter((_, position) => position !== index));
}

/**
 * The positions of the dividers between neighbouring shares, on a 0–100 scale.
 *
 * @param shares The shares, in order.
 * @returns One running total per divider, so one fewer than there are shares.
 */
export function splitBoundaries(shares: number[]): number[] {
  let running = 0;

  return shares.slice(0, -1).map((share) => {
    running += share;
    return toHundredths(running);
  });
}

/**
 * Moves one divider, trading share between its two neighbours and leaving every
 * other share and the total untouched. The move stops where a neighbour would
 * go below zero.
 *
 * @param shares The shares, in order.
 * @param boundary Which divider moved; divider `n` sits after share `n`.
 * @param position The divider's new position, on a 0–100 scale.
 * @returns The new shares, or the same values for an unknown divider.
 */
export function moveBoundary(
  shares: number[],
  boundary: number,
  position: number,
): number[] {
  const next = [...shares];
  if (boundary < 0 || boundary >= shares.length - 1) return next;

  const before = sumOf(shares.slice(0, boundary + 1));
  const delta = Math.min(
    shares[boundary + 1],
    Math.max(-shares[boundary], position - before),
  );

  next[boundary] = toHundredths(shares[boundary] + delta);
  next[boundary + 1] = toHundredths(shares[boundary + 1] - delta);

  return next;
}
