/**
 * The fields a user provides when setting their daily goals: the energy
 * budget, the macro split, and one row per daily meal ("Meal Slot"). Macro
 * percentages are global for the day; each slot's `percent` is that meal's
 * share of the total daily budget.
 */
export type NewGoals = {
  /** Total daily energy target in kilocalories. */
  calories: number;
  /** Share of daily energy coming from protein, 0–100. */
  proteinPct: number;
  /** Share of daily energy coming from carbohydrates, 0–100. */
  carbsPct: number;
  /** Share of daily energy coming from fat, 0–100. */
  fatPct: number;
  /** The day's meals, in dining order. */
  slots: NewMealSlot[];
};

/** One daily meal as submitted: a name and its share of the daily budget. */
export type NewMealSlot = {
  /** Display name, e.g. "Breakfast", "Lunch", or "Meal 1". */
  name: string;
  /** Share of the daily budget this meal gets, 0–100. */
  percent: number;
};

/** A stored meal slot: the submitted values plus identity and position. */
export type MealSlot = NewMealSlot & {
  /** Identifier generated on create. */
  id: string;
  /** Position in the dining order; slots arrive sorted by it. */
  sortOrder: number;
};

/** A stored goals row: the submitted values plus its identity and timestamps. */
export type Goals = NewGoals & {
  /** Identifier generated on create. */
  id: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-write timestamp; the goals form keys on it to re-seed. */
  updatedAt: string;
  /** The day's meals, ordered by `sortOrder`. */
  slots: MealSlot[];
};
