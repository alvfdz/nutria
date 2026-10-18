"use client";

import { useActionState, useId, useState } from "react";

import { createIngredientFromFoodfactsAction } from "@/app/ingredients/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FoodfactsSearchResult } from "@/lib/foodfacts/mapping";

/** Macros shown for each search result, keyed by their display label. */
type ResultMacro = {
  label: string;
  value: number | null;
  unit: string;
};

/**
 * Props for the OpenFoodFacts import component.
 */
interface FoodfactsImportProps {
  /** Called after an ingredient is imported, with its saved name. */
  onImported?: (name: string) => void;
}

/**
 * Renders the macros of one search result as a list, marking missing values as
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
    { label: "Fiber", value: result.macrosPer100g.fiberPer100g, unit: "g" },
    { label: "Sugar", value: result.macrosPer100g.sugarPer100g, unit: "g" },
    { label: "Sodium", value: result.macrosPer100g.sodiumPer100g, unit: "g" },
  ];

  return (
    <dl className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
      {macros.map((macro) => (
        <div key={macro.label} className="flex justify-between gap-2">
          <dt>{macro.label}</dt>
          <dd>
            {macro.value ?? "N/A"} {macro.unit}
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
 * @param props The result to import and an optional success callback.
 * @returns The import form markup.
 */
function ImportButton({
  result,
  onImported,
}: {
  result: FoodfactsSearchResult;
  onImported?: (name: string) => void;
}) {
  const [state, formAction, pending] = useActionState(
    createIngredientFromFoodfactsAction,
    { status: "idle", resetKey: 0 },
  );

  if (state.status === "success" && state.savedName) {
    onImported?.(state.savedName);
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
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

      {state.formError ? (
        <p role="alert" className="text-destructive text-xs">
          {state.formError}
        </p>
      ) : null}

      <Button
        type="submit"
        size="sm"
        disabled={pending || state.status === "success"}
        className="ml-auto"
      >
        {pending
          ? "Importing…"
          : state.status === "success"
            ? "Imported"
            : "Import"}
      </Button>
    </form>
  );
}

/**
 * Card that searches OpenFoodFacts on demand and lets the user import a chosen
 * product as an ingredient. Only the selected results are stored, so the user's
 * library is never flooded with the whole database.
 */
export function FoodfactsImport({ onImported }: FoodfactsImportProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodfactsSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const searchId = useId();

  /**
   * Runs the search against the internal proxy route and replaces the result
   * list, surfacing failures as an inline message.
   *
   * @param event Submit event of the search form.
   */
  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await fetch(
        `/api/foodfacts/search?q=${encodeURIComponent(q)}&limit=25`,
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Search failed");
      }

      const data = (await response.json()) as {
        results?: FoodfactsSearchResult[];
      };
      setResults(data.results ?? []);
    } catch (error) {
      setResults([]);
      setError(error instanceof Error ? error.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from OpenFoodFacts</CardTitle>
        <CardDescription>
          Search a product and import its name and macros per 100 g.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={handleSearch} className="flex items-end gap-2">
          <div className="grid flex-1 gap-1.5">
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
          <ul className="grid gap-2">
            {results.map((result) => (
              <li
                key={result.code}
                className="grid gap-2 rounded-md border p-3"
              >
                <div>
                  <p className="font-medium">{result.productName}</p>
                  {result.brand ? (
                    <p className="text-muted-foreground text-sm">
                      {result.brand}
                    </p>
                  ) : null}
                </div>
                <MacrosPer100g result={result} />
                <ImportButton result={result} onImported={onImported} />
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
