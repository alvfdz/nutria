"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "cn";
import { toast } from "sonner";

import {
  AddButton,
  LIBRARY_HEAD_CLASS,
  LIBRARY_NUMBER_CELL_CLASS,
  LibraryRowActions,
  LibraryRowName,
  MacroHeadLabel,
  SortableHead,
} from "@/components/library-table";
import { DeleteMealDialog } from "@/components/meals/delete-meal-dialog";
import { EditMealDialog } from "@/components/meals/edit-meal-dialog";
import { NewMealDialog } from "@/components/meals/new-meal-dialog";
import { MacroBar, type MacroName } from "@/components/segmented-bar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CARD_CLASS, CARD_TITLE_CLASS, ICON_STROKE } from "@/lib/design-system";
import { formatMacro } from "@/lib/ingredients/format";
import type { Ingredient } from "@/lib/ingredients/types";
import { macroCalorieShares, nextSort, type LibrarySort } from "@/lib/library";
import {
  filterMeals,
  formatMealItems,
  sortMeals,
  type MealSortKey,
} from "@/lib/meals/library";
import { computeMealTotals } from "@/lib/meals/macros";
import type { Meal } from "@/lib/meals/types";

/** The macro columns, in the fixed protein, carbs, fat order. */
const MACRO_COLUMNS: { macro: MacroName; label: string }[] = [
  { macro: "protein", label: "Protein" },
  { macro: "carbs", label: "Carbs" },
  { macro: "fat", label: "Fat" },
];

/** A number cell; on phones it sits close under the name above it. */
const NUMBER_CELL_CLASS = cn(LIBRARY_NUMBER_CELL_CLASS, "max-sm:pt-0");

/**
 * Lays a table row out for phones: the name and actions on the first line, and
 * the numbers on a line of their own, under headings laid out the same way. The
 * name needs the width more than the table needs to be one line per meal.
 */
const ROW_LAYOUT_CLASS =
  "max-sm:grid max-sm:grid-cols-[repeat(4,minmax(0,1fr))_2rem]";

/** Where a row's actions go in {@link ROW_LAYOUT_CLASS}. */
const ROW_ACTIONS_LAYOUT_CLASS = "max-sm:col-start-5 max-sm:row-start-1";

/** The names to highlight when nothing is being revealed. */
const NO_NAMES: ReadonlySet<string> = new Set();

/**
 * What a new library shows: the action that starts the job. A meal is built from
 * ingredients, so without any the action leads to the ingredient library instead.
 *
 * @param props.hasIngredients Whether there is anything to build a meal from.
 * @param props.onAdd Called when the user chooses to add a meal.
 * @returns The empty state; never throws.
 */
function EmptyLibrary({
  hasIngredients,
  onAdd,
}: {
  hasIngredients: boolean;
  onAdd: () => void;
}) {
  return (
    <Empty className="py-10">
      <EmptyHeader>
        <EmptyTitle className={CARD_TITLE_CLASS}>
          {hasIngredients
            ? "Your library is empty"
            : "A meal is a set of ingredients"}
        </EmptyTitle>
        <EmptyDescription>
          {hasIngredients
            ? "Combine your ingredients into a meal to start planning."
            : "Save a few ingredients, then combine them into the meals you cook often."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {hasIngredients ? (
          <AddButton onClick={onAdd}>Add meal</AddButton>
        ) : (
          <Link href="/ingredients" className={buttonVariants()}>
            Add ingredients first
          </Link>
        )}
      </EmptyContent>
    </Empty>
  );
}

/**
 * The meal library: every stored meal in a table that can be filtered and sorted,
 * with the action that adds to it. Each row lists its ingredients and shows its
 * macros' share of the calories as a bar. On phones a row takes two lines, so the
 * name and ingredients get the full width; because that takes the table out of
 * table layout, its parts state their roles. The totals are computed from the items
 * on every render, so they always reflect the current ingredient macros.
 *
 * The dialogs are mounted beside the table rather than inside it, so a first save
 * can replace the empty state without closing the dialog it came from.
 *
 * @param props.meals The meals to list, newest first.
 * @param props.ingredients The ingredients a meal can be built from.
 * @returns The library card; never throws.
 */
export function MealLibrary({
  meals,
  ingredients,
}: {
  meals: Meal[];
  ingredients: Ingredient[];
}) {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<LibrarySort<MealSortKey>>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Meal | null>(null);
  const [deleting, setDeleting] = useState<Meal | null>(null);
  const [highlighted, setHighlighted] = useState(NO_NAMES);
  const savedNames = useRef<string[]>([]);

  const visible = useMemo(
    () => sortMeals(filterMeals(meals, filter), sort),
    [meals, filter, sort],
  );

  /** Remembers a saved name, to highlight its row once the dialog is gone. */
  const rememberSaved = useCallback((name: string) => {
    savedNames.current.push(name);
  }, []);

  /** Highlights the rows saved while the dialog was covering the table. */
  const revealSaved = useCallback(() => {
    if (savedNames.current.length === 0) return;

    setHighlighted(new Set(savedNames.current));
    savedNames.current = [];
  }, []);

  const closeAdding = useCallback(() => {
    setAdding(false);
    revealSaved();
  }, [revealSaved]);
  const closeEditing = useCallback(() => {
    setEditing(null);
    revealSaved();
  }, [revealSaved]);
  const closeDeleting = useCallback(() => setDeleting(null), []);

  const handleAdded = useCallback(
    (name: string) => {
      // A filter could hide the new row, leaving nothing to highlight.
      setFilter("");
      rememberSaved(name);
      toast.success(`${name} added.`);
    },
    [rememberSaved],
  );
  const handleSaved = useCallback(
    (name: string) => {
      rememberSaved(name);
      toast.success(`${name} updated.`);
    },
    [rememberSaved],
  );
  const handleDeleted = useCallback((name: string) => {
    toast.success(`${name} deleted.`);
  }, []);

  function handleSort(column: MealSortKey) {
    setSort((current) => nextSort(current, column));
  }

  const count = meals.length;
  const noun = count === 1 ? "meal" : "meals";

  return (
    <Card className={CARD_CLASS}>
      <CardHeader>
        <CardTitle className={CARD_TITLE_CLASS}>Meal library</CardTitle>
        {count === 0 ? null : (
          <CardDescription>
            {filter.trim()
              ? `${visible.length} of ${count} ${noun}`
              : `${count} ${noun}`}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4">
        {count === 0 ? (
          <EmptyLibrary
            hasIngredients={ingredients.length > 0}
            onAdd={() => setAdding(true)}
          />
        ) : (
          <>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <InputGroup className="w-full min-w-0 sm:w-auto sm:flex-1 lg:max-w-xs">
                <InputGroupAddon aria-hidden="true">
                  <Search strokeWidth={ICON_STROKE} />
                </InputGroupAddon>
                <InputGroupInput
                  aria-label="Filter meals"
                  placeholder="Filter by meal or ingredient"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                />
              </InputGroup>
              <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto">
                <AddButton onClick={() => setAdding(true)}>Add meal</AddButton>
              </div>
            </div>

            {visible.length === 0 ? (
              <Empty className="py-10">
                <EmptyHeader>
                  <EmptyTitle className={cn(CARD_TITLE_CLASS, "wrap-anywhere")}>
                    Nothing matches “{filter.trim()}”
                  </EmptyTitle>
                  <EmptyDescription>
                    Check the spelling, or look for another ingredient.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFilter("")}
                  >
                    Clear filter
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <Table
                role="table"
                className="table-fixed max-sm:flex max-sm:flex-col"
              >
                <TableCaption className="type-caption mt-2 text-left max-sm:order-last">
                  Totals for the whole meal. Protein, carbs and fat in grams.
                  Bars show each macro’s share of the calories.
                </TableCaption>
                <TableHeader
                  role="rowgroup"
                  className="max-sm:block [&_tr]:border-border-subtle"
                >
                  <TableRow
                    role="row"
                    className={cn("hover:bg-transparent", ROW_LAYOUT_CLASS)}
                  >
                    <SortableHead
                      column="name"
                      sort={sort}
                      onSort={handleSort}
                      className="pl-0 text-left max-sm:col-span-4 sm:pl-0"
                    >
                      Meal
                    </SortableHead>
                    <SortableHead
                      column="calories"
                      sort={sort}
                      onSort={handleSort}
                      className="sm:w-20"
                    >
                      kcal
                    </SortableHead>
                    {MACRO_COLUMNS.map(({ macro, label }) => (
                      <SortableHead
                        key={macro}
                        column={macro}
                        sort={sort}
                        onSort={handleSort}
                        className="sm:w-20"
                      >
                        <MacroHeadLabel macro={macro} label={label} />
                      </SortableHead>
                    ))}
                    <TableHead
                      role="columnheader"
                      className={cn(
                        LIBRARY_HEAD_CLASS,
                        ROW_ACTIONS_LAYOUT_CLASS,
                        "pr-0 sm:w-20 sm:pr-0",
                      )}
                    >
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody role="rowgroup" className="max-sm:block">
                  {visible.map((meal) => {
                    const totals = computeMealTotals(meal);
                    const shares = macroCalorieShares(totals);
                    const items = formatMealItems(meal);

                    return (
                      <TableRow
                        role="row"
                        key={meal.id}
                        data-new={
                          highlighted.has(meal.name) ? "true" : undefined
                        }
                        onAnimationEnd={() => setHighlighted(NO_NAMES)}
                        className={cn(
                          "border-border-subtle data-[new=true]:animate-highlight-fade motion-reduce:data-[new=true]:animate-none",
                          ROW_LAYOUT_CLASS,
                        )}
                      >
                        <TableCell
                          role="cell"
                          className="min-w-0 pl-0 font-medium whitespace-normal max-sm:col-span-4 max-sm:pb-2"
                        >
                          <div className="grid min-w-0 gap-1.5">
                            <div className="grid min-w-0 gap-0.5">
                              <LibraryRowName name={meal.name} />
                              <div
                                className="type-caption text-muted-foreground line-clamp-2 font-normal wrap-anywhere sm:line-clamp-1"
                                title={items}
                              >
                                {items}
                              </div>
                            </div>
                            {shares ? (
                              <div className="max-w-48 min-w-0">
                                <MacroBar {...shares} />
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell role="cell" className={NUMBER_CELL_CLASS}>
                          {formatMacro(totals.calories)}
                        </TableCell>
                        <TableCell role="cell" className={NUMBER_CELL_CLASS}>
                          {formatMacro(totals.protein)}
                        </TableCell>
                        <TableCell role="cell" className={NUMBER_CELL_CLASS}>
                          {formatMacro(totals.carbs)}
                        </TableCell>
                        <TableCell role="cell" className={NUMBER_CELL_CLASS}>
                          {formatMacro(totals.fat)}
                        </TableCell>
                        <TableCell
                          role="cell"
                          className={cn(
                            "py-1 pr-0 pl-1 text-right sm:pl-2",
                            ROW_ACTIONS_LAYOUT_CLASS,
                          )}
                        >
                          <LibraryRowActions
                            name={meal.name}
                            onEdit={() => setEditing(meal)}
                            onDelete={() => setDeleting(meal)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>

      {adding ? (
        <NewMealDialog
          ingredients={ingredients}
          onClose={closeAdding}
          onSaved={handleAdded}
        />
      ) : null}

      {editing ? (
        <EditMealDialog
          key={editing.id}
          meal={editing}
          ingredients={ingredients}
          onClose={closeEditing}
          onSaved={handleSaved}
        />
      ) : null}

      {deleting ? (
        <DeleteMealDialog
          key={deleting.id}
          meal={deleting}
          onClose={closeDeleting}
          onDeleted={handleDeleted}
        />
      ) : null}
    </Card>
  );
}
