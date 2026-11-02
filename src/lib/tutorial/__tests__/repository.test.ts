import { beforeEach, describe, expect, test, vi } from "vitest";

import { getPrisma } from "@/lib/db/prisma";
import { hasSeenTutorial, markTutorialSeen } from "@/lib/tutorial/repository";
import { testUser } from "@test/factories";

vi.mock("@/lib/db/prisma", () => ({ getPrisma: vi.fn() }));

const user = { findUnique: vi.fn(), update: vi.fn() };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getPrisma).mockReturnValue({ user } as never);
});

describe("hasSeenTutorial", () => {
  test("is true once a date is stored, reading only that user", async () => {
    user.findUnique.mockResolvedValue({ tutorialSeenAt: new Date() });

    await expect(hasSeenTutorial(testUser.id)).resolves.toBe(true);
    expect(user.findUnique).toHaveBeenCalledWith({
      where: { id: testUser.id },
      select: { tutorialSeenAt: true },
    });
  });

  test("is false before they've seen it", async () => {
    user.findUnique.mockResolvedValue({ tutorialSeenAt: null });

    await expect(hasSeenTutorial(testUser.id)).resolves.toBe(false);
  });

  test("is false for a user that doesn't exist", async () => {
    user.findUnique.mockResolvedValue(null);

    await expect(hasSeenTutorial(testUser.id)).resolves.toBe(false);
  });
});

describe("markTutorialSeen", () => {
  test("stamps only that user", async () => {
    await markTutorialSeen(testUser.id);

    expect(user.update).toHaveBeenCalledWith({
      where: { id: testUser.id },
      data: { tutorialSeenAt: expect.any(Date) },
    });
  });

  test("passes on a failed write", async () => {
    user.update.mockRejectedValue(new Error("gone"));

    await expect(markTutorialSeen(testUser.id)).rejects.toThrow("gone");
  });
});
