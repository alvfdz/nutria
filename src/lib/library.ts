import { KCAL_PER_GRAM } from "@/lib/goals/budget";

/**
 * A library table's sort: a column and direction, or `null` for newest first.
 *
 * @typeParam K The columns the table can sort by.
 */
export type LibrarySort<K extends string> = {
  /** The column being sorted. */
  key: K;
  /** The direction of the sort. */
  direction: "asc" | "desc";
} | null;

/**
 * Prepares text for matching: case and accents are ignored, so `jamon` finds
 * `Jamón`.
 *
 * @param text The text to normalize.
 * @returns The trimmed, lowercase text without diacritics.
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Orders two names alphabetically, ignoring case and accents.
 *
 * @param a The first name.
 * @param b The second name.
 * @returns A negative number when `a` comes first, positive when `b` does, and
 *   zero when they sort the same.
 */
export function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

/**
 * The sort after a column heading is clicked. Each column cycles through its
 * natural direction, the opposite one, and back to newest first. Names start
 * A to Z; numbers start highest first, the usual question being "what has the
 * most protein?".
 *
 * @typeParam K The columns the table can sort by; `name` is the text column.
 * @param current The current sort.
 * @param key The column that was clicked.
 * @returns The next sort.
 */
export function nextSort<K extends string>(
  current: LibrarySort<K>,
  key: K,
): LibrarySort<K> {
  const first = key === "name" ? "asc" : "desc";

  if (current?.key !== key) return { key, direction: first };
  if (current.direction === first) {
    return { key, direction: first === "asc" ? "desc" : "asc" };
  }

  return null;
}

/**
 * Each macro's share of the calories its grams provide. The shares come from
 * the macros rather than the stated calories, so they always total 100.
 *
 * @param grams The food's macros in grams, for any amount of it.
 * @returns The percentages, or `null` when it has no macros to compare, as with
 * water or salt.
 */
export function macroCalorieShares(grams: {
  protein: number;
  carbs: number;
  fat: number;
}): { proteinPct: number; carbsPct: number; fatPct: number } | null {
  const protein = grams.protein * KCAL_PER_GRAM.protein;
  const carbs = grams.carbs * KCAL_PER_GRAM.carbs;
  const fat = grams.fat * KCAL_PER_GRAM.fat;
  const total = protein + carbs + fat;

  if (total <= 0) return null;

  return {
    proteinPct: (protein / total) * 100,
    carbsPct: (carbs / total) * 100,
    fatPct: (fat / total) * 100,
  };
}
