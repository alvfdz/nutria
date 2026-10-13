/**
 * Error raised when a meal slot is deleted while planned meals on today or a
 * future day still reference it. Deleting the slot would cascade those plans
 * away, so `saveGoals` refuses and names the affected days instead.
 *
 * Lives in its own module (rather than in `repository.ts`) so server actions
 * and their tests can import it without pulling in the `server-only`
 * repository and its Prisma machinery.
 */
export class SlotInUseError extends Error {
  /** Display name of the slot that was about to be removed. */
  readonly slotName: string;
  /** The `YYYY-MM-DD` days that still have a plan in the slot. */
  readonly dayKeys: string[];

  /**
   * @param slotName Display name of the slot that was about to be removed.
   * @param dayKeys The days that still have a plan in the slot.
   */
  constructor(slotName: string, dayKeys: string[]) {
    super(`Meal slot "${slotName}" is used by plans on ${dayKeys.join(", ")}`);
    this.name = "SlotInUseError";
    this.slotName = slotName;
    this.dayKeys = dayKeys;
  }
}
