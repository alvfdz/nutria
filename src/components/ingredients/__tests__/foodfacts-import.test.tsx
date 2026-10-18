import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FoodfactsImport } from "../foodfacts-import";
import type { FoodfactsSearchResult } from "@/lib/foodfacts/mapping";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("@/app/ingredients/actions", () => ({
  createIngredientFromFoodfactsAction: vi.fn(async (prev: unknown) => prev),
}));

/**
 * Builds a search result with the given overrides, so each test only states
 * the fields it cares about.
 *
 * @param overrides Fields to merge onto the default product.
 * @returns A search result fixture.
 */
function makeResult(
  overrides: Partial<FoodfactsSearchResult> = {},
): FoodfactsSearchResult {
  return {
    code: "12345",
    productName: "Almond Butter",
    brand: "TestBrand",
    macrosPer100g: {
      caloriesPer100g: 567,
      proteinPer100g: 21.2,
      carbsPer100g: 18.7,
      fatPer100g: 49.4,
      fiberPer100g: null,
      sugarPer100g: null,
      sodiumPer100g: null,
      energyKcalPer100g: 567,
      energyKjPer100g: null,
    },
    ...overrides,
  };
}

describe("FoodfactsImport", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders the search form", () => {
    render(<FoodfactsImport />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  });

  it("performs a search and displays the results", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [makeResult()] }),
    });

    render(<FoodfactsImport />);
    await user.type(screen.getByRole("textbox"), "almond");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText("Almond Butter")).toBeInTheDocument();
    });
    expect(screen.getByText("TestBrand")).toBeInTheDocument();
    expect(screen.getByText("567 kcal")).toBeInTheDocument();
    expect(screen.getByText("21.2 g")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /import/i })).toBeInTheDocument();
  });

  it("shows the upstream error message when the search fails", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });

    render(<FoodfactsImport />);
    await user.type(screen.getByRole("textbox"), "test");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Server error");
    });
  });

  it("shows an empty state when nothing matches", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    });

    render(<FoodfactsImport />);
    await user.type(screen.getByRole("textbox"), "nonexistent");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
    });
  });

  it("marks missing macros as N/A", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          makeResult({
            macrosPer100g: {
              caloriesPer100g: null,
              proteinPer100g: null,
              carbsPer100g: null,
              fatPer100g: null,
              fiberPer100g: null,
              sugarPer100g: null,
              sodiumPer100g: null,
              energyKcalPer100g: null,
              energyKjPer100g: null,
            },
          }),
        ],
      }),
    });

    render(<FoodfactsImport />);
    await user.type(screen.getByRole("textbox"), "test");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/N\/A/).length).toBeGreaterThan(0);
    });
  });

  it("does not search an empty query", async () => {
    const user = userEvent.setup();
    render(<FoodfactsImport />);
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
