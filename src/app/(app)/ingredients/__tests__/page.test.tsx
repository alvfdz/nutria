import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import IngredientsPage from "@/app/(app)/ingredients/page";
import { requireUser } from "@/lib/auth/session";
import { listIngredients } from "@/lib/ingredients/repository";
import { makeIngredient, testUser } from "@test/factories";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/ingredients/repository", () => ({
  createIngredient: vi.fn(),
  listIngredients: vi.fn(),
  updateIngredient: vi.fn(),
  deleteIngredient: vi.fn(),
}));
// `next/cache` only exists in the server runtime; the actions are pulled in
// transitively by the forms and dialogs, never called here.
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireUser).mockResolvedValue(testUser);
});

describe("IngredientsPage", () => {
  test("renders the signed-in user's ingredients in the library", async () => {
    vi.mocked(listIngredients).mockResolvedValue([
      makeIngredient({ name: "Rolled oats" }),
    ]);

    render(await IngredientsPage());

    expect(listIngredients).toHaveBeenCalledWith(testUser.id);
    expect(
      screen.getByRole("heading", { level: 1, name: "Ingredients" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Rolled oats")).toBeInTheDocument();
  });

  test("reads nothing when signed out and lets the login redirect through", async () => {
    const redirectToLogin = new Error("NEXT_REDIRECT");
    vi.mocked(requireUser).mockRejectedValue(redirectToLogin);

    await expect(IngredientsPage()).rejects.toBe(redirectToLogin);
    expect(listIngredients).not.toHaveBeenCalled();
  });
});
