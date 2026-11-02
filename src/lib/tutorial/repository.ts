import "server-only";

import { getPrisma } from "@/lib/db/prisma";

/**
 * Whether a user has already closed the welcome tutorial. Read on its own, so
 * the session and its user type don't need to know about the tutorial.
 *
 * @param userId The user to check.
 * @returns True once they've seen it.
 */
export async function hasSeenTutorial(userId: string): Promise<boolean> {
  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { tutorialSeenAt: true },
  });

  return Boolean(user?.tutorialSeenAt);
}

/**
 * Records that a user has closed the welcome tutorial. Replaying it later moves
 * the date on, which nothing depends on.
 *
 * @param userId The user who closed it.
 * @throws If the user no longer exists.
 */
export async function markTutorialSeen(userId: string): Promise<void> {
  await getPrisma().user.update({
    where: { id: userId },
    data: { tutorialSeenAt: new Date() },
  });
}
