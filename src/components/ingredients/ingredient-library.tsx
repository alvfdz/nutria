"use client";

import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";

import { Search } from "lucide-react";
import { cn } from "cn";
import { toast } from "sonner";

import { DeleteIngredientDialog } from "@/components/ingredients/delete-ingredient-dialog";
import { EditIngredientDialog } from "@/components/ingredients/edit-ingredient-dialog";
import { FoodfactsImportDialog } from "@/components/ingredients/foodfacts-import";
import { NewIngredientDialog } from "@/components/ingredients/new-ingredient-dialog";
import {
  AddButton,
  LIBRARY_HEAD_CLASS,
  LIBRARY_NUMBER_CELL_CLASS,
  LibraryRowActions,
  LibraryRowName,
  MacroHeadLabel,
  SortableHead,
} from "@/components/library-table";
import { MacroBar, type MacroName } from "@/components/segmented-bar";
import { Button } from "@/components/ui/button";
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
import {
  filterIngredients,
  sortIngredients,
  type IngredientUsage,
  type SortKey,
} from "@/lib/ingredients/library";
import type { Ingredient } from "@/lib/ingredients/types";
import { macroCalorieShares, nextSort, type LibrarySort } from "@/lib/library";

/** The macro columns, in the fixed protein, carbs, fat order. */
const MACRO_COLUMNS: { macro: MacroName; label: string; key: SortKey }[] = [
  { macro: "protein", label: "Protein", key: "proteinPer100g" },
  { macro: "carbs", label: "Carbs", key: "carbsPer100g" },
  { macro: "fat", label: "Fat", key: "fatPer100g" },
];

/** The names to highlight when nothing is being revealed. */
const NO_NAMES: ReadonlySet<string> = new Set();

/**
 * What a new library shows: the start of the job rather than a description of
 * it, so a first search is one field away.
 *
 * @param props.onSearch Called with the text to search OpenFoodFacts for.
 * @param props.onAdd Called when the user chooses to add by hand.
 * @returns The empty state; never throws.
 */
function EmptyLibrary({
  onSearch,
  onAdd,
}: {
  onSearch: (query: string) => void;
  onAdd: () => void;
}) {
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(query.trim());
  }

  return (
    <Empty className="py-10">
      <EmptyHeader>
        <EmptyTitle className={CARD_TITLE_CLASS}>
          Your library is empty
        </EmptyTitle>
        <EmptyDescription>
          Search OpenFoodFacts for a food, or add one by hand.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <form onSubmit={handleSubmit} className="flex w-full min-w-0 gap-2">
          <InputGroup className="min-w-0 flex-1">
            <InputGroupAddon aria-hidden="true">
              <Search strokeWidth={ICON_STROKE} />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search OpenFoodFacts"
              placeholder="e.g. almond butter"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </InputGroup>
          <Button type="submit">Search</Button>
        </form>
        <AddButton onClick={onAdd}>Add manually</AddButton>
      </EmptyContent>
    </Empty>
  );
}

/**
 * The ingredient library: every stored ingredient in a table that can be
 * filtered and sorted, with the actions that add to it. Importing is the primary
 * way in, since common foods rarely need typing by hand. Each row shows its
 * macros' share of the calories as a bar, and offers edit and delete, folded into
 * one menu on phones so the name keeps its room.
 *
 * The dialogs are mounted beside the table rather than inside it, so a first
 * import can replace the empty state without closing the dialog it came from.
 *
 * @param props.ingredients The ingredients to list, newest first.
 * @param props.usage Which meals use each ingredient, to explain before a delete
 *   is refused.
 * @returns The library card; never throws.
 */
export function IngredientLibrary({
  ingredients,
  usage = {},
}: {
  ingredients: Ingredient[];
  usage?: IngredientUsage;
}) {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<LibrarySort<SortKey>>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [deleting, setDeleting] = useState<Ingredient | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importQuery, setImportQuery] = useState("");
  const [highlighted, setHighlighted] = useState(NO_NAMES);
  const savedNames = useRef<string[]>([]);

  const visible = useMemo(
    () => sortIngredients(filterIngredients(ingredients, filter), sort),
    [ingredients, filter, sort],
  );
  const ingredientNames = useMemo(
    () => ingredients.map((ingredient) => ingredient.name),
    [ingredients],
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

  function openImport(query: string) {
    setImportQuery(query);
    setImportOpen(true);
  }

  function handleImportOpenChange(open: boolean) {
    setImportOpen(open);
    if (!open) revealSaved();
  }

  function handleSort(column: SortKey) {
    setSort((current) => nextSort(current, column));
  }

  const isEmpty = ingredients.length === 0;
  const count = ingredients.length;
  const noun = count === 1 ? "ingredient" : "ingredients";

  return (
    <Card className={CARD_CLASS}>
      <CardHeader>
        <CardTitle className={CARD_TITLE_CLASS}>Ingredient library</CardTitle>
        {isEmpty ? null : (
          <CardDescription>
            {filter.trim()
              ? `${visible.length} of ${count} ${noun}`
              : `${count} ${noun}`}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4">
        {isEmpty ? (
          <EmptyLibrary onSearch={openImport} onAdd={() => setAdding(true)} />
        ) : (
          <>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <InputGroup className="w-full min-w-0 sm:w-auto sm:flex-1 lg:max-w-xs">
                <InputGroupAddon aria-hidden="true">
                  <Search strokeWidth={ICON_STROKE} />
                </InputGroupAddon>
                <InputGroupInput
                  aria-label="Filter ingredients"
                  placeholder="Filter by name"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                />
              </InputGroup>
              <div className="flex w-full flex-col-reverse gap-2 sm:ml-auto sm:w-auto sm:flex-row">
                <AddButton onClick={() => setAdding(true)}>
                  Add manually
                </AddButton>
                <Button type="button" onClick={() => openImport("")}>
                  Import from OpenFoodFacts
                </Button>
              </div>
            </div>

            {visible.length === 0 ? (
              <Empty className="py-10">
                <EmptyHeader>
                  <EmptyTitle className={cn(CARD_TITLE_CLASS, "wrap-anywhere")}>
                    Nothing matches “{filter.trim()}”
                  </EmptyTitle>
                  <EmptyDescription>
                    Check the spelling, or look for it on OpenFoodFacts.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent className="flex-row flex-wrap justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFilter("")}
                  >
                    Clear filter
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openImport(filter.trim())}
                  >
                    Search OpenFoodFacts
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <Table className="table-fixed">
                <TableCaption className="type-caption mt-2 text-left">
                  Per 100 g of product. Protein, carbs and fat in grams. Bars
                  show each macro’s share of the calories.
                </TableCaption>
                <TableHeader className="[&_tr]:border-border-subtle">
                  <TableRow className="hover:bg-transparent">
                    <SortableHead
                      column="name"
                      sort={sort}
                      onSort={handleSort}
                      className="pl-0 text-left sm:pl-0"
                    >
                      Ingredient
                    </SortableHead>
                    <SortableHead
                      column="caloriesPer100g"
                      sort={sort}
                      onSort={handleSort}
                      className="w-14 sm:w-20"
                    >
                      kcal
                    </SortableHead>
                    {MACRO_COLUMNS.map(({ macro, label, key }) => (
                      <SortableHead
                        key={macro}
                        column={key}
                        sort={sort}
                        onSort={handleSort}
                        className="w-12 sm:w-20"
                      >
                        <MacroHeadLabel macro={macro} label={label} />
                      </SortableHead>
                    ))}
                    <TableHead
                      className={cn(
                        LIBRARY_HEAD_CLASS,
                        "w-9 pr-0 sm:w-20 sm:pr-0",
                      )}
                    >
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((ingredient) => {
                    const shares = macroCalorieShares({
                      protein: ingredient.proteinPer100g,
                      carbs: ingredient.carbsPer100g,
                      fat: ingredient.fatPer100g,
                    });
                    const isNew = highlighted.has(ingredient.name);

                    return (
                      <TableRow
                        key={ingredient.id}
                        data-new={isNew ? "true" : undefined}
                        onAnimationEnd={() => setHighlighted(NO_NAMES)}
                        className="border-border-subtle data-[new=true]:animate-highlight-fade motion-reduce:data-[new=true]:animate-none"
                      >
                        <TableCell className="min-w-0 pl-0 font-medium whitespace-normal">
                          <div className="grid min-w-0 gap-1.5">
                            <LibraryRowName name={ingredient.name} />
                            {shares ? (
                              <div className="max-w-48 min-w-0">
                                <MacroBar {...shares} />
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className={LIBRARY_NUMBER_CELL_CLASS}>
                          {formatMacro(ingredient.caloriesPer100g)}
                        </TableCell>
                        <TableCell className={LIBRARY_NUMBER_CELL_CLASS}>
                          {formatMacro(ingredient.proteinPer100g)}
                        </TableCell>
                        <TableCell className={LIBRARY_NUMBER_CELL_CLASS}>
                          {formatMacro(ingredient.carbsPer100g)}
                        </TableCell>
                        <TableCell className={LIBRARY_NUMBER_CELL_CLASS}>
                          {formatMacro(ingredient.fatPer100g)}
                        </TableCell>
                        <TableCell className="py-1 pr-0 pl-1 text-right sm:pl-2">
                          <LibraryRowActions
                            name={ingredient.name}
                            onEdit={() => setEditing(ingredient)}
                            onDelete={() => setDeleting(ingredient)}
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
        <NewIngredientDialog onClose={closeAdding} onSaved={handleAdded} />
      ) : null}

      {editing ? (
        <EditIngredientDialog
          key={editing.id}
          ingredient={editing}
          onClose={closeEditing}
          onSaved={handleSaved}
        />
      ) : null}

      {deleting ? (
        <DeleteIngredientDialog
          key={deleting.id}
          ingredient={deleting}
          usedIn={usage[deleting.id]}
          onClose={closeDeleting}
          onDeleted={handleDeleted}
        />
      ) : null}

      <FoodfactsImportDialog
        open={importOpen}
        onOpenChange={handleImportOpenChange}
        initialQuery={importQuery}
        ingredientNames={ingredientNames}
        onImported={rememberSaved}
      />
    </Card>
  );
}
