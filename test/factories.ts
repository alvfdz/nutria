import type { AuthUser } from "@/lib/auth/types";
import type { Ingredient, NewIngredient } from "@/lib/ingredients/types";
import type { Goals, MealSlot, NewGoals } from "@/lib/goals/types";
import type { MacroBudget, SlotBudget } from "@/lib/goals/budget";
import type { MealTotals } from "@/lib/meals/macros";
import type { Meal, MealItem, NewMeal } from "@/lib/meals/types";
import type {
  DayColumn,
  PlannedMeal,
  PlannedMealItemView,
  PlannedMealView,
  SlotView,
} from "@/lib/plan/types";

/**
 * The signed-in user the suites act as: what a mocked `requireUser()` returns
 * and the `userId` every repository call is expected to be scoped by.
 */
export const testUser: AuthUser = {
  id: "user-1",
  email: "owner@example.com",
  name: "Owner",
};

/**
 * Builds a signed-in user, for suites that need a second account to check
 * that another user's rows stay out of reach.
 *
 * @param overrides Fields to change on top of {@link testUser}.
 */
export function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return { ...testUser, ...overrides };
}

/** Sensible defaults for an ingredient, overridable field by field. */
export const ingredientDefaults: NewIngredient = {
  name: "Chicken breast, raw",
  caloriesPer100g: 165,
  proteinPer100g: 31.5,
  carbsPer100g: 0,
  fatPer100g: 3.6,
};

/**
 * Builds a stored ingredient with a deterministic id and timestamp.
 *
 * @param overrides Fields to change on top of {@link ingredientDefaults}.
 */
export function makeIngredient(
  overrides: Partial<Ingredient> = {},
): Ingredient {
  return {
    ...ingredientDefaults,
    id: "ingredient-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Builds the form submission a browser would send for the ingredient form.
 *
 * @param values Fields to set; `null` leaves the field out of the submission.
 */
export function makeIngredientFormData(
  values: Record<string, string | null> = {},
): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (value === null) {
      formData.delete(key);
      continue;
    }
    formData.set(key, value);
  }

  return formData;
}

/** Builds a complete, valid ingredient submission as strings. */
export function makeValidIngredientFormData(
  overrides: Record<string, string | null> = {},
): FormData {
  return makeIngredientFormData({
    name: ingredientDefaults.name,
    caloriesPer100g: String(ingredientDefaults.caloriesPer100g),
    proteinPer100g: String(ingredientDefaults.proteinPer100g),
    carbsPer100g: String(ingredientDefaults.carbsPer100g),
    fatPer100g: String(ingredientDefaults.fatPer100g),
    ...overrides,
  });
}

/** Sensible defaults for a meal, overridable field by field. */
export const mealDefaults: NewMeal = {
  name: "Oatmeal & Protein Bowl",
  items: [
    { ingredientId: "9f1c1f9e-0000-4000-8000-000000000001", grams: 80 },
    { ingredientId: "9f1c1f9e-0000-4000-8000-000000000002", grams: 200 },
  ],
};

/**
 * Builds a stored meal with a deterministic id, timestamp, and ordered items
 * whose embedded ingredients reuse {@link ingredientDefaults}.
 *
 * @param overrides Fields to change on top of the defaults.
 */
export function makeMeal(overrides: Partial<Meal> = {}): Meal {
  const items: MealItem[] = mealDefaults.items.map((item, index) => ({
    ...item,
    id: `meal-item-${index + 1}`,
    sortOrder: index,
    ingredient: makeIngredient({
      id: item.ingredientId,
      name: index === 0 ? "Oats" : "Milk",
    }),
  }));

  return {
    id: "meal-1",
    name: mealDefaults.name,
    createdAt: "2026-01-01T00:00:00.000Z",
    items,
    ...overrides,
  };
}

/**
 * Builds the form submission a browser would send for the meal form. The
 * builder posts one `ingredientId` and one `grams` entry per row, so the rows
 * are appended in order; a `null` half leaves that entry out entirely, which
 * is how a row missing half its fields reaches the validator.
 *
 * @param values Scalar fields to set; `null` leaves the field out.
 * @param items The rows to append, in builder order.
 */
export function makeMealFormData(
  values: Record<string, string | null> = {},
  items: { ingredientId: string | null; grams: string | null }[] = [],
): FormData {
  const formData = makeIngredientFormData(values);

  for (const item of items) {
    if (item.ingredientId !== null) {
      formData.append("ingredientId", item.ingredientId);
    }
    if (item.grams !== null) {
      formData.append("grams", item.grams);
    }
  }

  return formData;
}

/**
 * Builds a complete, valid meal submission as strings.
 *
 * @param overrides Scalar fields to set; `null` leaves the field out.
 * @param items Rows to submit; defaults to {@link mealDefaults}.
 */
export function makeValidMealFormData(
  overrides: Record<string, string | null> = {},
  items?: { ingredientId: string | null; grams: string | null }[],
): FormData {
  return makeMealFormData(
    { name: mealDefaults.name, ...overrides },
    items ??
      mealDefaults.items.map((item) => ({
        ingredientId: item.ingredientId,
        grams: String(item.grams),
      })),
  );
}

/** Sensible defaults for the daily goals, overridable field by field. */
export const goalsDefaults: NewGoals = {
  calories: 2000,
  proteinPct: 30,
  carbsPct: 40,
  fatPct: 30,
  slots: [
    { name: "Breakfast", percent: 30 },
    { name: "Lunch", percent: 40 },
    { name: "Dinner", percent: 30 },
  ],
};

/**
 * Builds stored goals with a deterministic id and timestamps, and slots whose
 * ids and sort order follow the defaults.
 *
 * @param overrides Fields to change on top of the defaults.
 */
export function makeGoals(overrides: Partial<Goals> = {}): Goals {
  return {
    ...goalsDefaults,
    id: "goals-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    slots: goalsDefaults.slots.map((slot, index) =>
      makeMealSlot({
        id: `meal-slot-${index + 1}`,
        name: slot.name,
        percent: slot.percent,
        sortOrder: index,
      }),
    ),
    ...overrides,
  };
}

/**
 * Builds a stored meal slot with a deterministic id, overridable field by
 * field.
 *
 * @param overrides Fields to change on top of the defaults.
 */
export function makeMealSlot(overrides: Partial<MealSlot> = {}): MealSlot {
  return {
    id: "meal-slot-1",
    name: "Breakfast",
    percent: 30,
    sortOrder: 0,
    ...overrides,
  };
}

/**
 * Builds a stored plan row, defaulting to the first meal in the first slot on
 * `2026-10-13`.
 *
 * @param overrides Fields to change on top of the defaults.
 */
export function makePlannedMeal(
  overrides: Partial<PlannedMeal> = {},
): PlannedMeal {
  const meal = overrides.meal ?? makeMeal();

  return {
    id: "plan-meal-1",
    date: "2026-10-13",
    mealSlotId: "meal-slot-1",
    mealId: meal.id,
    sortOrder: 0,
    eaten: false,
    ...overrides,
    meal,
  };
}

/** Sensible defaults for one planned-meal ingredient view. */
export const plannedMealItemDefaults: PlannedMealItemView = {
  id: "meal-item-1",
  name: "Oats",
  grams: 80,
  calories: 311.2,
};

/**
 * Builds one planned-meal ingredient view, overridable field by field.
 *
 * @param overrides Fields to change on top of the defaults.
 */
export function makePlannedMealItem(
  overrides: Partial<PlannedMealItemView> = {},
): PlannedMealItemView {
  return { ...plannedMealItemDefaults, ...overrides };
}

/** Sensible defaults for one planned meal view. */
export const plannedMealViewDefaults: PlannedMealView = {
  id: "plan-meal-1",
  mealId: "meal-1",
  name: "Oatmeal & Protein Bowl",
  eaten: false,
  totals: { calories: 462, protein: 88.2, carbs: 0, fat: 10.08 },
  items: [makePlannedMealItem()],
};

/**
 * Builds one planned meal view, overridable field by field.
 *
 * @param overrides Fields to change on top of the defaults.
 */
export function makePlannedMealView(
  overrides: Partial<PlannedMealView> = {},
): PlannedMealView {
  return { ...plannedMealViewDefaults, ...overrides };
}

/** The daily target used by {@link makeDayColumn} and friends. */
export const macroBudgetDefaults: MacroBudget = {
  calories: 2200,
  proteinGrams: 156,
  carbsGrams: 200,
  fatGrams: 70,
};

/** The slot target used by {@link makeSlotView}, overridable field by field. */
export const slotBudgetDefaults: SlotBudget = {
  calories: 660,
  proteinGrams: 46.8,
  carbsGrams: 60,
  fatGrams: 21,
};

/** A zeroed totals row, shared by the view builders. */
const ZERO_TOTALS: MealTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

/**
 * Builds one slot view with nothing planned, overridable field by field.
 *
 * @param overrides Fields to change on top of the defaults.
 */
export function makeSlotView(overrides: Partial<SlotView> = {}): SlotView {
  return {
    id: "meal-slot-1",
    name: "Breakfast",
    percent: 30,
    target: slotBudgetDefaults,
    meals: [],
    totals: ZERO_TOTALS,
    ...overrides,
  };
}

/**
 * Builds one day column with a single empty slot, overridable field by field.
 *
 * @param overrides Fields to change on top of the defaults.
 */
export function makeDayColumn(overrides: Partial<DayColumn> = {}): DayColumn {
  return {
    date: "2026-10-12",
    weekday: "Mon",
    dayOfMonth: "12",
    isToday: false,
    isEditable: true,
    budget: macroBudgetDefaults,
    planned: ZERO_TOTALS,
    slots: [makeSlotView()],
    ...overrides,
  };
}

/**
 * Builds the form submission an assign dialog would send.
 *
 * @param values Fields to set; `null` leaves the field out of the submission.
 */
export function makeAssignMealFormData(
  values: Record<string, string | null> = {},
): FormData {
  return makeIngredientFormData(values);
}

/**
 * Builds the form submission a slot card's remove form would send.
 *
 * @param values Fields to set; `null` leaves the field out of the submission.
 */
export function makeRemoveMealFormData(
  values: Record<string, string | null> = {},
): FormData {
  return makeIngredientFormData(values);
}

/**
 * Builds the form submission a tick on the Today page would send.
 *
 * @param values Fields to set; `null` leaves the field out of the submission.
 */
export function makeSetMealEatenFormData(
  values: Record<string, string | null> = {},
): FormData {
  return makeIngredientFormData(values);
}

/**
 * Builds the form submission the swap picker would send.
 *
 * @param values Fields to set; `null` leaves the field out of the submission.
 */
export function makeSwapMealFormData(
  values: Record<string, string | null> = {},
): FormData {
  return makeIngredientFormData(values);
}

/**
 * Builds the form submission a browser would send for the goals form. The
 * form posts one `slotName` and one `slotPercent` entry per meal, so the rows
 * are appended in order; a `null` half leaves that entry out entirely, which
 * is how a row missing half its fields reaches the validator.
 *
 * @param values Scalar fields to set; `null` leaves the field out.
 * @param slots The rows to append, in dining order.
 */
export function makeGoalsFormData(
  values: Record<string, string | null> = {},
  slots: { name: string | null; percent: string | null }[] = [],
): FormData {
  const formData = makeIngredientFormData(values);

  for (const slot of slots) {
    if (slot.name !== null) {
      formData.append("slotName", slot.name);
    }
    if (slot.percent !== null) {
      formData.append("slotPercent", slot.percent);
    }
  }

  return formData;
}

/**
 * Builds a complete, valid goals submission as strings.
 *
 * @param overrides Scalar fields to set; `null` leaves the field out.
 * @param slots Rows to submit; defaults to {@link goalsDefaults}.
 */
export function makeValidGoalsFormData(
  overrides: Record<string, string | null> = {},
  slots?: { name: string | null; percent: string | null }[],
): FormData {
  return makeGoalsFormData(
    {
      calories: String(goalsDefaults.calories),
      proteinPct: String(goalsDefaults.proteinPct),
      carbsPct: String(goalsDefaults.carbsPct),
      fatPct: String(goalsDefaults.fatPct),
      ...overrides,
    },
    slots ??
      goalsDefaults.slots.map((slot) => ({
        name: slot.name,
        percent: String(slot.percent),
      })),
  );
}
