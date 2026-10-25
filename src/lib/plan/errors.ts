/**
 * Error raised when a meal is planned against a meal template or a meal slot
 * the user does not own, or that no longer exists. Both cases look the same
 * on purpose, so another user's ids reveal nothing.
 *
 * Lives in its own module (rather than in `repository.ts`) so server actions
 * and their tests can import it without pulling in the `server-only`
 * repository and its Prisma machinery.
 */
export class PlanTargetNotFoundError extends Error {
  /** Which reference failed: the meal template or the meal slot. */
  readonly target: "meal" | "slot";

  /**
   * @param target Which reference failed.
   * @param id The id that was submitted for it.
   */
  constructor(target: "meal" | "slot", id: string) {
    super(`Unknown ${target === "meal" ? "meal" : "meal slot"}: ${id}`);
    this.name = "PlanTargetNotFoundError";
    this.target = target;
  }
}
