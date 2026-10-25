import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createIngredientFromFoodfactsAction } from "@/app/ingredients/actions";
import {
  FoodfactsImport,
  formatMacro,
  INITIAL_SEARCH_STATE,
  searchReducer,
} from "../foodfacts-import";
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

/**
 * Renders the component and opens its dialog.
 *
 * @returns The configured user-event instance.
 */
async function openDialog() {
  const user = userEvent.setup();
  render(<FoodfactsImport />);
  await user.click(
    screen.getByRole("button", { name: "Import from OpenFoodFacts" }),
  );
  return user;
}

describe("FoodfactsImport", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("keeps the dialog closed until the trigger is clicked", async () => {
    render(<FoodfactsImport />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Import from OpenFoodFacts" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });

  it("renders results in a scrollable list", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [makeResult()] }),
    });
    const user = await openDialog();
    await user.type(screen.getByRole("textbox"), "almond");
    await user.click(screen.getByRole("button", { name: "Search" }));

    const list = await screen.findByTestId("foodfacts-results");
    expect(list).toHaveClass("overflow-y-auto");
  });

  it("performs a search and displays the results", async () => {
    const user = await openDialog();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [makeResult()] }),
    });

    await user.type(screen.getByRole("textbox"), "almond");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText("Almond Butter")).toBeInTheDocument();
    });
    expect(screen.getByText("TestBrand")).toBeInTheDocument();
    expect(screen.getByText("567 kcal")).toBeInTheDocument();
    expect(screen.getByText("21.2 g")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeInTheDocument();
  });

  it("shows the upstream error message when the search fails", async () => {
    const user = await openDialog();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });

    await user.type(screen.getByRole("textbox"), "test");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Server error");
    });
  });

  it("shows an empty state when nothing matches", async () => {
    const user = await openDialog();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    });

    await user.type(screen.getByRole("textbox"), "nonexistent");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
    });
  });

  it("marks missing macros as N/A", async () => {
    const user = await openDialog();
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

    await user.type(screen.getByRole("textbox"), "test");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/N\/A/).length).toBeGreaterThan(0);
    });
  });

  it("shows calories, protein, carbs and fat, rounded to two decimals", async () => {
    const user = await openDialog();
    const base = makeResult();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          makeResult({
            macrosPer100g: {
              ...base.macrosPer100g,
              proteinPer100g: 21.23456,
              carbsPer100g: 18.7,
              fatPer100g: 49,
              fiberPer100g: 3,
              sugarPer100g: 2,
              sodiumPer100g: 1,
            },
          }),
        ],
      }),
    });

    await user.type(screen.getByRole("textbox"), "test");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText("21.23 g")).toBeInTheDocument();
    });
    expect(screen.getByText("18.7 g")).toBeInTheDocument();
    expect(screen.getByText("49 g")).toBeInTheDocument();
    expect(screen.getByText("Calories")).toBeInTheDocument();
    expect(screen.queryByText("Fiber")).not.toBeInTheDocument();
    expect(screen.queryByText("Sugar")).not.toBeInTheDocument();
    expect(screen.queryByText("Sodium")).not.toBeInTheDocument();
  });

  it("shows the product picture, or a placeholder when missing", async () => {
    const user = await openDialog();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          makeResult({ imageUrl: "https://img.test/a.jpg" }),
          makeResult({ code: "2", imageUrl: undefined }),
        ],
      }),
    });

    await user.type(screen.getByRole("textbox"), "almond");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(screen.getAllByTestId("foodfacts-no-image")).toHaveLength(1);
    });
    const img = screen.getByTestId("foodfacts-results").querySelector("img")!;
    expect(img).toHaveAttribute("src", "https://img.test/a.jpg");
    expect(screen.getByTestId("foodfacts-image-loading")).toBeInTheDocument();

    fireEvent.load(img);
    expect(
      screen.queryByTestId("foodfacts-image-loading"),
    ).not.toBeInTheDocument();
  });

  it("falls back to the no-image placeholder when the picture fails", async () => {
    const user = await openDialog();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [makeResult({ imageUrl: "https://img.test/broken.jpg" })],
      }),
    });

    await user.type(screen.getByRole("textbox"), "almond");
    await user.click(screen.getByRole("button", { name: /search/i }));

    const img = (await waitFor(() => {
      const el = screen.getByTestId("foodfacts-results").querySelector("img");
      expect(el).not.toBeNull();
      return el;
    }))!;
    fireEvent.error(img);

    expect(screen.getByTestId("foodfacts-no-image")).toBeInTheDocument();
  });

  it("labels the placeholder for assistive tech and sends no referrer", async () => {
    const user = await openDialog();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          makeResult({ imageUrl: "https://img.test/a.jpg" }),
          makeResult({ code: "2", imageUrl: undefined }),
        ],
      }),
    });

    await user.type(screen.getByRole("textbox"), "almond");
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(
      await screen.findByRole("img", { name: "No image available" }),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("foodfacts-results").querySelector("img"),
    ).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("resets the image state when the picture URL changes", async () => {
    const user = await openDialog();
    const respond = (imageUrl: string) =>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [makeResult({ imageUrl })] }),
      });

    respond("https://img.test/broken.jpg");
    await user.type(screen.getByRole("textbox"), "almond");
    await user.click(screen.getByRole("button", { name: /search/i }));
    const img = await waitFor(() => {
      const el = screen.getByTestId("foodfacts-results").querySelector("img");
      expect(el).not.toBeNull();
      return el!;
    });
    fireEvent.error(img);
    expect(screen.getByTestId("foodfacts-no-image")).toBeInTheDocument();

    respond("https://img.test/fixed.jpg");
    await user.click(screen.getByRole("button", { name: /search/i }));
    await waitFor(() => {
      expect(
        screen.getByTestId("foodfacts-results").querySelector("img"),
      ).toHaveAttribute("src", "https://img.test/fixed.jpg");
    });
  });

  it("aborts the in-flight search when the dialog closes", async () => {
    const user = await openDialog();
    mockFetch.mockImplementationOnce(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );

    await user.type(screen.getByRole("textbox"), "almond");
    await user.click(screen.getByRole("button", { name: /search/i }));
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(mockFetch.mock.calls[0][1].signal.aborted).toBe(true);
    });
    await user.click(
      screen.getByRole("button", { name: "Import from OpenFoodFacts" }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeEnabled();
  });

  it("clears the results when the dialog is closed and reopened", async () => {
    const user = await openDialog();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [makeResult()] }),
    });
    await user.type(screen.getByRole("textbox"), "almond");
    await user.click(screen.getByRole("button", { name: /search/i }));
    expect(await screen.findByText("Almond Butter")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    await user.click(
      screen.getByRole("button", { name: "Import from OpenFoodFacts" }),
    );

    expect(screen.queryByText("Almond Butter")).not.toBeInTheDocument();
  });

  it("does not report an error when onImported throws", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.mocked(createIngredientFromFoodfactsAction).mockResolvedValueOnce({
      status: "success",
      savedName: "Almond Butter",
      resetKey: 1,
    });
    const user = userEvent.setup();
    render(
      <FoodfactsImport
        onImported={() => {
          throw new Error("boom");
        }}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Import from OpenFoodFacts" }),
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [makeResult()] }),
    });
    await user.type(screen.getByRole("textbox"), "almond");
    await user.click(screen.getByRole("button", { name: /search/i }));
    await screen.findByText("Almond Butter");
    await user.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("clears the query when the dialog is closed", async () => {
    const user = await openDialog();
    await user.type(screen.getByRole("textbox"), "almond");
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    await user.click(
      screen.getByRole("button", { name: "Import from OpenFoodFacts" }),
    );

    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("calls onImported once with the saved name", async () => {
    const onImported = vi.fn();
    vi.mocked(createIngredientFromFoodfactsAction).mockResolvedValueOnce({
      status: "success",
      savedName: "Almond Butter",
      resetKey: 1,
    });
    const user = userEvent.setup();
    render(<FoodfactsImport onImported={onImported} />);
    await user.click(
      screen.getByRole("button", { name: "Import from OpenFoodFacts" }),
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [makeResult()] }),
    });
    await user.type(screen.getByRole("textbox"), "almond");
    await user.click(screen.getByRole("button", { name: /search/i }));
    await user.click(await screen.findByRole("button", { name: "Import" }));

    await waitFor(() => expect(onImported).toHaveBeenCalledTimes(1));
    expect(onImported).toHaveBeenCalledWith("Almond Butter");
  });

  it("lets the product be imported again once its ingredient is removed", async () => {
    vi.mocked(createIngredientFromFoodfactsAction).mockResolvedValueOnce({
      status: "success",
      savedName: "Almond Butter",
      resetKey: 1,
    });
    const user = userEvent.setup();
    const { rerender } = render(<FoodfactsImport ingredientNames={[]} />);
    await user.click(
      screen.getByRole("button", { name: "Import from OpenFoodFacts" }),
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [makeResult({ brand: undefined })] }),
    });
    await user.type(screen.getByRole("textbox"), "almond");
    await user.click(screen.getByRole("button", { name: /search/i }));
    await screen.findByText("Almond Butter");
    expect(screen.getByRole("button", { name: "Import" })).toBeEnabled();

    rerender(<FoodfactsImport ingredientNames={["Almond Butter"]} />);
    expect(
      await screen.findByRole("button", { name: "Imported" }),
    ).toBeDisabled();

    rerender(<FoodfactsImport ingredientNames={[]} />);
    expect(screen.getByRole("button", { name: "Import" })).toBeEnabled();
  });

  it("stays imported after success until the library catches up", async () => {
    vi.mocked(createIngredientFromFoodfactsAction).mockResolvedValueOnce({
      status: "success",
      savedName: "Almond Butter",
      resetKey: 1,
    });
    const user = userEvent.setup();
    const { rerender } = render(<FoodfactsImport ingredientNames={[]} />);
    await user.click(
      screen.getByRole("button", { name: "Import from OpenFoodFacts" }),
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [makeResult({ brand: undefined })] }),
    });
    await user.type(screen.getByRole("textbox"), "almond");
    await user.click(screen.getByRole("button", { name: /search/i }));
    await user.click(await screen.findByRole("button", { name: "Import" }));

    expect(
      await screen.findByRole("button", { name: "Imported" }),
    ).toBeDisabled();

    rerender(<FoodfactsImport ingredientNames={["Almond Butter"]} />);
    rerender(<FoodfactsImport ingredientNames={[]} />);
    expect(screen.getByRole("button", { name: "Import" })).toBeEnabled();
  });

  it("marks a product imported from the library, brand included", async () => {
    const user = userEvent.setup();
    render(<FoodfactsImport ingredientNames={["Almond Butter (BrandCo)"]} />);
    await user.click(
      screen.getByRole("button", { name: "Import from OpenFoodFacts" }),
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [makeResult({ brand: "BrandCo" })],
      }),
    });
    await user.type(screen.getByRole("textbox"), "almond");
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(
      await screen.findByRole("button", { name: "Imported" }),
    ).toBeDisabled();
  });

  it("shows a product once when a response repeats its code", async () => {
    const user = await openDialog();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [makeResult(), makeResult()] }),
    });
    await user.type(screen.getByRole("textbox"), "almond");
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(await screen.findAllByText("Almond Butter")).toHaveLength(1);
  });

  it("ignores a response that arrives after the dialog was closed", async () => {
    const user = await openDialog();
    let resolveJson: (value: unknown) => void = () => {};
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => new Promise((resolve) => (resolveJson = resolve)),
    });
    await user.type(screen.getByRole("textbox"), "almond");
    await user.click(screen.getByRole("button", { name: /search/i }));
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    resolveJson({ results: [makeResult()] });
    await user.click(
      screen.getByRole("button", { name: "Import from OpenFoodFacts" }),
    );

    expect(screen.queryByText("Almond Butter")).not.toBeInTheDocument();
  });

  describe("load more", () => {
    /** Queues a search response for the next fetch call. */
    function respond(body: unknown) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => body,
      });
    }

    async function searchAlmond(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByRole("textbox"), "almond");
      await user.click(screen.getByRole("button", { name: /search/i }));
    }

    it("appends the next page and hides the button on the last one", async () => {
      const user = await openDialog();
      respond({ results: [makeResult()], page: 1, pages: 2 });
      await searchAlmond(user);
      await screen.findByText("Almond Butter");

      respond({
        results: [makeResult({ code: "2", productName: "Cashew Butter" })],
        page: 2,
        pages: 2,
      });
      await user.click(screen.getByRole("button", { name: "Load more" }));

      expect(await screen.findByText("Cashew Butter")).toBeInTheDocument();
      expect(screen.getByText("Almond Butter")).toBeInTheDocument();
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining("page=2"),
        expect.anything(),
      );
      expect(
        screen.queryByRole("button", { name: "Load more" }),
      ).not.toBeInTheDocument();
    });

    it("keeps the loaded results when loading more fails", async () => {
      const user = await openDialog();
      respond({ results: [makeResult()], page: 1, pages: 2 });
      await searchAlmond(user);
      await screen.findByText("Almond Butter");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: "Busy" }),
      });
      await user.click(screen.getByRole("button", { name: "Load more" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Busy");
      expect(screen.getByText("Almond Butter")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Load more" })).toBeEnabled();
    });

    it("keeps offering more when a page has no page count", async () => {
      const user = await openDialog();
      respond({ results: [makeResult()] });
      await searchAlmond(user);

      expect(
        await screen.findByRole("button", { name: "Load more" }),
      ).toBeInTheDocument();
    });

    it("hides the button once a page comes back empty", async () => {
      const user = await openDialog();
      respond({ results: [makeResult()] });
      await searchAlmond(user);
      await screen.findByText("Almond Butter");

      respond({ results: [] });
      await user.click(screen.getByRole("button", { name: "Load more" }));

      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: "Load more" }),
        ).not.toBeInTheDocument();
      });
    });

    it("announces how many results are loaded", async () => {
      const user = await openDialog();
      respond({ results: [makeResult()], page: 1, pages: 1 });
      await searchAlmond(user);

      expect(await screen.findByRole("status")).toHaveTextContent(
        "1 results loaded",
      );
    });

    it("keeps paging the searched text after the input is edited", async () => {
      const user = await openDialog();
      respond({ results: [makeResult()], page: 1, pages: 2 });
      await searchAlmond(user);
      await screen.findByText("Almond Butter");

      await user.type(screen.getByRole("textbox"), " extra");
      respond({ results: [], page: 2, pages: 2 });
      await user.click(screen.getByRole("button", { name: "Load more" }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.stringContaining("q=almond&page=2"),
          expect.anything(),
        );
      });
    });
  });

  it("requests 10 results per search", async () => {
    const user = await openDialog();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    });

    await user.type(screen.getByRole("textbox"), "almond");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=10"),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  it("does not search an empty query", async () => {
    const user = await openDialog();
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("formatMacro", () => {
  it("rounds to two decimals and drops trailing zeros", () => {
    expect(formatMacro(1.005 * 1000)).toBe("1005");
    expect(formatMacro(12.3456)).toBe("12.35");
    expect(formatMacro(0)).toBe("0");
  });

  it("rounds floating-point halves up", () => {
    expect(formatMacro(1.005)).toBe("1.01");
    expect(formatMacro(2.675)).toBe("2.68");
    expect(formatMacro(-1.005)).toBe("-1.01");
    expect(formatMacro(1e-7)).toBe("0");
    expect(formatMacro(-0.001)).toBe("0");
    expect(formatMacro(-12.3456)).toBe("-12.35");
  });

  it("returns N/A for non-finite values", () => {
    expect(formatMacro(Number.NaN)).toBe("N/A");
    expect(formatMacro(Number.POSITIVE_INFINITY)).toBe("N/A");
  });

  it("returns N/A for missing values", () => {
    expect(formatMacro(null)).toBe("N/A");
  });
});

describe("searchReducer", () => {
  const a = makeResult({ code: "a" });
  const b = makeResult({ code: "b" });
  const loaded = searchReducer(INITIAL_SEARCH_STATE, {
    type: "success",
    query: "almond",
    page: 1,
    received: [a],
    append: false,
    totalPages: 3,
  });

  it("stores a first page and its paging info", () => {
    expect(loaded).toMatchObject({
      results: [a],
      activeQuery: "almond",
      lastPage: 1,
      hasMore: true,
      loading: false,
    });
  });

  it("appends later pages without repeating codes", () => {
    const next = searchReducer(loaded, {
      type: "success",
      query: "almond",
      page: 2,
      received: [a, b],
      append: true,
      totalPages: 3,
    });

    expect(next.results).toEqual([a, b]);
    expect(next.lastPage).toBe(2);
  });

  it("has no more pages after the last one", () => {
    const next = searchReducer(loaded, {
      type: "success",
      query: "almond",
      page: 3,
      received: [b],
      append: true,
      totalPages: 3,
    });

    expect(next.hasMore).toBe(false);
  });

  it("without a page count, stops when a page adds nothing new", () => {
    const withNew = searchReducer(INITIAL_SEARCH_STATE, {
      type: "success",
      query: "q",
      page: 1,
      received: [a],
      append: false,
    });
    const repeated = searchReducer(withNew, {
      type: "success",
      query: "q",
      page: 2,
      received: [a],
      append: true,
    });

    expect(withNew.hasMore).toBe(true);
    expect(repeated.hasMore).toBe(false);
  });

  it("resets everything when a first-page search fails", () => {
    const next = searchReducer(loaded, {
      type: "failure",
      append: false,
      message: "Busy",
    });

    expect(next).toEqual({
      ...INITIAL_SEARCH_STATE,
      searched: true,
      error: "Busy",
    });
  });

  it("keeps the loaded results when loading more fails", () => {
    const next = searchReducer(loaded, {
      type: "failure",
      append: true,
      message: "Busy",
    });

    expect(next).toMatchObject({
      results: [a],
      lastPage: 1,
      hasMore: true,
      error: "Busy",
      loading: false,
    });
  });

  it("marks a first-page search as started and clears the previous error", () => {
    const failed = searchReducer(loaded, {
      type: "failure",
      append: true,
      message: "Busy",
    });
    const next = searchReducer(failed, { type: "start", append: false });

    expect(next).toMatchObject({ loading: true, error: null, searched: true });
  });

  it("does not count a load-more start as a first search", () => {
    const next = searchReducer(INITIAL_SEARCH_STATE, {
      type: "start",
      append: true,
    });

    expect(next).toMatchObject({ loading: true, searched: false });
  });

  it("returns to the initial state on reset", () => {
    expect(searchReducer(loaded, { type: "reset" })).toBe(INITIAL_SEARCH_STATE);
  });
});
