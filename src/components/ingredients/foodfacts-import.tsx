"use client";

import { ImageOff } from "lucide-react";
import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { createIngredientFromFoodfactsAction } from "@/app/ingredients/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { buildIngredientName } from "@/lib/foodfacts/ingredient-name";
import { cn } from "@/lib/utils";
import type {
  FoodfactsSearchResponse,
  FoodfactsSearchResult,
} from "@/lib/foodfacts/mapping";

/** Library names used when none are given; a stable reference for `useMemo`. */
const NO_INGREDIENTS: readonly string[] = [];

/** Number of products requested per search. */
const RESULT_LIMIT = 10;

/** Macros shown for each search result, keyed by their display label. */
type ResultMacro = {
  label: string;
  value: number | null;
  unit: string;
};

/**
 * Drops repeated products, keeping the first of each barcode, so every result
 * row has a unique React key.
 *
 * @param results Search results as returned by the API.
 * @returns The results without repeated codes.
 */
export function uniqueByCode(
  results: FoodfactsSearchResult[],
): FoodfactsSearchResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    if (seen.has(result.code)) return false;
    seen.add(result.code);
    return true;
  });
}

/**
 * Everything the dialog knows about the current search, kept in one value so
 * the pieces (results, paging, errors) can never drift out of sync.
 */
export interface SearchState {
  /** Products shown, without repeated codes. */
  results: FoodfactsSearchResult[];
  /** Whether a page is being fetched. */
  loading: boolean;
  /** Message of the last failed request, if any. */
  error: string | null;
  /** Whether a first-page search was started since the dialog opened. */
  searched: boolean;
  /** Text of the search whose pages are being loaded. */
  activeQuery: string;
  /** Last page loaded for `activeQuery`, 1-based. */
  lastPage: number;
  /** Whether another page may exist. */
  hasMore: boolean;
  /**
   * How many results were shown before the last "load more" page arrived, so
   * the rows after that index are the new ones. 0 when the last load was a
   * first-page search.
   */
  previousCount: number;
  /** Whether the page being fetched is added to the list ("load more"). */
  appending: boolean;
}

/** Search state of a freshly opened dialog. */
export const INITIAL_SEARCH_STATE: SearchState = {
  results: [],
  loading: false,
  error: null,
  searched: false,
  activeQuery: "",
  lastPage: 1,
  hasMore: false,
  previousCount: 0,
  appending: false,
};

/** Transitions accepted by {@link searchReducer}. */
export type SearchAction =
  | { type: "reset" }
  | { type: "start"; append: boolean }
  | {
      type: "success";
      query: string;
      page: number;
      received: FoodfactsSearchResult[];
      append: boolean;
      totalPages?: number;
    }
  | { type: "failure"; message: string; append: boolean }
  | { type: "stop" };

/**
 * Computes the next search state. A failed first page clears the results and
 * the paging info together, while a failed "load more" keeps what is on screen.
 *
 * @param state The current search state.
 * @param action The transition to apply.
 * @returns The next state.
 */
export function searchReducer(
  state: SearchState,
  action: SearchAction,
): SearchState {
  switch (action.type) {
    case "reset":
      return INITIAL_SEARCH_STATE;
    case "start":
      return {
        ...state,
        loading: true,
        error: null,
        searched: state.searched || !action.append,
        // The rows of the previous page are no longer new.
        previousCount: 0,
        appending: action.append,
      };
    case "success": {
      const results = uniqueByCode(
        action.append
          ? [...state.results, ...action.received]
          : action.received,
      );
      // Without a page count, keep paging only while a page brings new rows.
      const hasMore =
        action.totalPages !== undefined
          ? action.page < action.totalPages
          : results.length > (action.append ? state.results.length : 0);
      return {
        ...state,
        results,
        loading: false,
        activeQuery: action.query,
        lastPage: action.page,
        hasMore,
        previousCount: action.append ? state.results.length : 0,
      };
    }
    case "failure":
      return action.append
        ? { ...state, loading: false, error: action.message }
        : {
            ...INITIAL_SEARCH_STATE,
            searched: true,
            error: action.message,
          };
    case "stop":
      return { ...state, loading: false };
  }
}

/**
 * Props for the OpenFoodFacts import component.
 */
interface FoodfactsImportProps {
  /**
   * Names of the ingredients currently in the library. A product is marked as
   * imported while the name it would be saved under is listed, so deleting
   * the ingredient makes it importable again.
   */
  ingredientNames?: readonly string[];
  /** Called after an ingredient is imported, with its saved name. */
  onImported?: (name: string) => void;
}

/**
 * Product thumbnail with an explicit state for each stage: a pulsing box while
 * the picture loads, and a "no image" icon when the product has none or the
 * picture fails to load. Render it with `key={src}` so the state resets when
 * the URL changes.
 *
 * @param props The thumbnail URL, if the product has one.
 * @returns The thumbnail markup.
 */
function ProductImage({ src }: { src?: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );

  // Stable identity so React only runs it on mount. A cached image can finish
  // before React attaches `onLoad`.
  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setStatus("loaded");
  }, []);

  if (!src || status === "error") {
    return (
      <div
        data-testid="foodfacts-no-image"
        role="img"
        aria-label="No image available"
        className="bg-muted text-muted-foreground flex size-14 shrink-0 items-center justify-center rounded-md"
      >
        <ImageOff className="size-5" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      data-testid={status === "loading" ? "foodfacts-image-loading" : undefined}
      className={cn(
        "bg-muted size-14 shrink-0 overflow-hidden rounded-md",
        status === "loading" && "animate-pulse",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        width={56}
        height={56}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        className="size-full object-contain"
      />
    </div>
  );
}

/**
 * Formats a macro value for display, rounded to at most two decimals. Halves
 * round away from zero despite binary floating point (1.005 becomes 1.01 and
 * -1.005 becomes -1.01).
 *
 * @param value The macro amount, or `null` when OpenFoodFacts has none.
 * @returns The rounded number as text, or "N/A" when missing or not finite.
 */
export function formatMacro(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  const abs = Math.abs(value);
  // Anything below half a hundredth rounds to zero. This also covers tiny
  // values that JavaScript prints in exponent form (1e-7).
  if (abs < 0.005) return "0";
  // Shifting the decimal point through exponent notation avoids the binary
  // error of `abs * 100`. Large values already in exponent form (1e+21) have
  // no decimals worth rounding.
  if (String(abs).includes("e")) return String(value);
  const rounded = Number(`${Math.round(Number(`${abs}e2`))}e-2`);
  return String(value < 0 ? -rounded : rounded);
}

/**
 * Renders the four macros stored on import (calories, protein, carbs and fat)
 * of one search result as a list, marking missing values as
 * "N/A" so an imported ingredient is never silently misleading.
 *
 * @param result The OpenFoodFacts search result to display.
 * @returns The macro list markup.
 */
function MacrosPer100g({ result }: { result: FoodfactsSearchResult }) {
  const macros: ResultMacro[] = [
    {
      label: "Calories",
      value: result.macrosPer100g.caloriesPer100g,
      unit: "kcal",
    },
    { label: "Protein", value: result.macrosPer100g.proteinPer100g, unit: "g" },
    { label: "Carbs", value: result.macrosPer100g.carbsPer100g, unit: "g" },
    { label: "Fat", value: result.macrosPer100g.fatPer100g, unit: "g" },
  ];

  return (
    <dl className="grid grid-cols-4 gap-1.5">
      {macros.map((macro) => (
        <div
          key={macro.label}
          className="bg-muted/60 min-w-0 rounded-md px-2 py-1"
        >
          <dt className="text-muted-foreground truncate text-[11px] leading-tight">
            {macro.label}
          </dt>
          <dd className="truncate text-sm leading-tight font-medium tabular-nums">
            {formatMacro(macro.value)} {macro.unit}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Import button for a single search result. Submits the result to the
 * OpenFoodFacts server action as hidden fields and reports the outcome inline.
 *
 * @param props The result to import, whether it was already imported, and a
 *   callback invoked with the saved name once the import succeeds.
 * @returns The import form markup.
 */
function ImportButton({
  result,
  imported,
  onSuccess,
}: {
  result: FoodfactsSearchResult;
  imported: boolean;
  onSuccess?: (name: string) => void;
}) {
  // The action outlives the render that created it, so it reads the latest
  // callback from a ref instead of closing over a stale one.
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);
  const [state, formAction, pending] = useActionState(
    async (
      prev: Awaited<ReturnType<typeof createIngredientFromFoodfactsAction>>,
      formData: FormData,
    ) => {
      const next = await createIngredientFromFoodfactsAction(prev, formData);
      if (next.status === "success" && next.savedName) {
        try {
          onSuccessRef.current?.(next.savedName);
        } catch (error) {
          // The ingredient is already saved, so a failing callback must not
          // turn the action result into an error.
          console.error("onImported callback failed", error);
        }
      }
      return next;
    },
    { status: "idle", resetKey: 0 },
  );
  // Between the action succeeding and the refreshed library arriving, `imported`
  // is still false; stay done until the library has shown this import once, so
  // a second click cannot save a duplicate.
  const [seenKey, setSeenKey] = useState(0);
  if (state.status === "success" && imported && seenKey !== state.resetKey) {
    setSeenKey(state.resetKey);
  }
  const done =
    imported || (state.status === "success" && seenKey !== state.resetKey);

  return (
    <form
      action={formAction}
      className="flex shrink-0 flex-col items-end gap-1"
    >
      <input type="hidden" name="productName" value={result.productName} />
      <input type="hidden" name="brand" value={result.brand ?? ""} />
      <input
        type="hidden"
        name="caloriesPer100g"
        value={result.macrosPer100g.caloriesPer100g ?? ""}
      />
      <input
        type="hidden"
        name="proteinPer100g"
        value={result.macrosPer100g.proteinPer100g ?? ""}
      />
      <input
        type="hidden"
        name="carbsPer100g"
        value={result.macrosPer100g.carbsPer100g ?? ""}
      />
      <input
        type="hidden"
        name="fatPer100g"
        value={result.macrosPer100g.fatPer100g ?? ""}
      />

      <Button type="submit" size="sm" disabled={pending || done}>
        {pending ? "Importing…" : done ? "Imported" : "Import"}
      </Button>

      {state.formError ? (
        <p
          role="alert"
          className="text-destructive max-w-40 text-right text-xs [overflow-wrap:anywhere]"
        >
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}

/**
 * Button that opens a dialog to search OpenFoodFacts on demand and import a
 * chosen product as an ingredient. The results scroll inside the dialog, and
 * only the selected products are stored, so the user's library is never
 * flooded with the whole database.
 *
 * @param props The library's ingredient names, used to mark products already
 * imported, and an optional callback invoked after a product is imported.
 * @returns The trigger button and its import dialog.
 */
export function FoodfactsImport({
  ingredientNames = NO_INGREDIENTS,
  onImported,
}: FoodfactsImportProps) {
  const [query, setQuery] = useState("");
  const [search, dispatch] = useReducer(searchReducer, INITIAL_SEARCH_STATE);
  const {
    results,
    loading,
    error,
    searched,
    activeQuery,
    lastPage,
    hasMore,
    previousCount,
    appending,
  } = search;
  const libraryNames = useMemo(
    () => new Set(ingredientNames),
    [ingredientNames],
  );
  const searchId = useId();
  const controllerRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // After a "load more" page lands, bring its first row into view: the rows are
  // appended below the fold of the scrollable list, so nothing else shows that
  // the click did anything.
  useEffect(() => {
    if (previousCount === 0) return;
    const list = listRef.current;
    const firstNew = list?.children[previousCount];
    if (!list || !firstNew) return;
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Scroll the list itself: `scrollIntoView` would also scroll the dialog
    // and the page, pushing the header or the button out of view.
    list.scrollTo?.({
      top:
        list.scrollTop +
        firstNew.getBoundingClientRect().top -
        list.getBoundingClientRect().top,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [lastPage, previousCount]);

  /**
   * Whether the library already holds the ingredient this result would be
   * saved as.
   *
   * @param result The search result to check.
   * @returns `true` while that ingredient is in the library.
   */
  function isImported(result: FoodfactsSearchResult) {
    return libraryNames.has(
      buildIngredientName(result.productName, result.brand),
    );
  }

  /**
   * Cancels the in-flight search and clears the dialog state when it closes,
   * so reopening never shows stale results.
   *
   * @param open Whether the dialog is now open.
   */
  function handleOpenChange(open: boolean) {
    if (open) return;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setQuery("");
    dispatch({ type: "reset" });
  }

  /**
   * Fetches one page from the internal proxy route. Page 1 replaces the result
   * list; later pages are appended. Failures show as an inline message, and a
   * failed "load more" keeps the results already on screen.
   *
   * @param q Trimmed search text.
   * @param page 1-based page to fetch.
   */
  async function fetchPage(q: string, page: number) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const append = page > 1;

    dispatch({ type: "start", append });

    try {
      const response = await fetch(
        `/api/foodfacts/search?q=${encodeURIComponent(q)}&page=${page}&limit=${RESULT_LIMIT}`,
        { signal: controller.signal },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Search failed");
      }

      const data = (await response.json()) as Partial<FoodfactsSearchResponse>;
      if (controller.signal.aborted || controllerRef.current !== controller) {
        return;
      }
      dispatch({
        type: "success",
        query: q,
        page,
        received: data.results ?? [],
        append,
        totalPages: data.pages,
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      dispatch({
        type: "failure",
        append,
        message: error instanceof Error ? error.message : "Search failed",
      });
    } finally {
      if (controllerRef.current === controller) dispatch({ type: "stop" });
    }
  }

  /**
   * Starts a new search from the first page.
   *
   * @param event Submit event of the search form.
   */
  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    void fetchPage(q, 1);
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        Import from OpenFoodFacts
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from OpenFoodFacts</DialogTitle>
          <DialogDescription>
            Search a product and import its name and macros per 100 g.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSearch} className="flex items-end gap-2">
          <div className="grid min-w-0 flex-1 gap-1.5">
            <Label htmlFor={searchId}>Search</Label>
            <Input
              id={searchId}
              placeholder="e.g. almond butter"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </Button>
        </form>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        {!loading && !error && searched && results.length === 0 ? (
          <p className="text-muted-foreground text-sm">No results found.</p>
        ) : null}

        {results.length > 0 ? (
          <ul
            ref={listRef}
            data-testid="foodfacts-results"
            className="grid max-h-[50vh] gap-2 overflow-y-auto pr-1"
          >
            {results.map((result, index) => (
              <li
                key={result.code}
                data-new={
                  previousCount > 0 && index >= previousCount
                    ? "true"
                    : undefined
                }
                className="data-[new=true]:animate-highlight-fade grid min-w-0 gap-2 rounded-md border p-2.5 motion-reduce:data-[new=true]:animate-none"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ProductImage key={result.imageUrl} src={result.imageUrl} />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate leading-snug font-medium"
                      title={result.productName}
                    >
                      {result.productName}
                    </p>
                    {result.brand ? (
                      <p
                        className="text-muted-foreground truncate text-sm leading-snug"
                        title={result.brand}
                      >
                        {result.brand}
                      </p>
                    ) : null}
                  </div>
                  <ImportButton
                    result={result}
                    imported={isImported(result)}
                    onSuccess={onImported}
                  />
                </div>
                <MacrosPer100g result={result} />
              </li>
            ))}
          </ul>
        ) : null}

        <p
          role="status"
          aria-live="polite"
          className="text-muted-foreground text-sm empty:hidden"
        >
          {loading
            ? appending
              ? "Loading more results…"
              : "Searching…"
            : results.length === 0
              ? ""
              : previousCount > 0 && previousCount === results.length
                ? `No new results. Showing ${results.length}`
                : `Showing ${results.length} ${results.length === 1 ? "result" : "results"}`}
        </p>

        {results.length > 0 && hasMore ? (
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            aria-busy={loading}
            onClick={() => void fetchPage(activeQuery, lastPage + 1)}
          >
            {loading ? (
              <Spinner
                data-icon="inline-start"
                data-testid="foodfacts-load-more-spinner"
              />
            ) : null}
            Load more
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
