/**
 * Error raised when a meal write references an `ingredientId` that no longer
 * exists. PostgreSQL reports that as a foreign-key violation, which Prisma
 * surfaces as code `P2003`; the repository translates it here so the server
 * actions can answer with a specific form message instead of the generic
 * "could not be saved" one.
 *
 * Lives in its own module (rather than in `repository.ts`) so server actions
 * and their tests can import it without pulling in the `server-only`
 * repository and its Prisma machinery.
 */
export class UnknownIngredientError extends Error {
  constructor() {
    super("Meal references an ingredient that no longer exists");
    this.name = "UnknownIngredientError";
  }
}
