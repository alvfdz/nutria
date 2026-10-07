/**
 * Error raised when deleting an ingredient that meal templates still
 * reference. The foreign key on `meal_items` would reject the delete anyway;
 * counting first lets the server action turn the failure into a friendly,
 * testable message instead of a raw database error.
 *
 * Lives in its own module (rather than in `repository.ts`) so server actions
 * and their tests can import it without pulling in the `server-only`
 * repository and its Prisma machinery.
 */
export class IngredientInUseError extends Error {
  /** How many meals reference the ingredient. */
  readonly mealCount: number;

  /**
   * @param mealCount Number of meals that reference the ingredient.
   */
  constructor(mealCount: number) {
    super(
      `Ingredient is used in ${mealCount} meal${mealCount === 1 ? "" : "s"}`,
    );
    this.name = "IngredientInUseError";
    this.mealCount = mealCount;
  }
}
