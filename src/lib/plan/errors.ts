/**
 * Error raised when a meal is assigned to a slot that already holds the same
 * template on the same day. The `[date, mealSlotId, mealId]` unique index is
 * the source of truth; translating Prisma's `P2002` here lets the calendar
 * action answer with a specific message instead of the generic one.
 *
 * Lives in its own module (rather than in `repository.ts`) so server actions
 * and their tests can import it without pulling in the `server-only`
 * repository and its Prisma machinery.
 */
export class AlreadyPlannedError extends Error {
  constructor() {
    super("Meal is already planned in that slot");
    this.name = "AlreadyPlannedError";
  }
}
