"use client";

import { useCallback, useState } from "react";

import { Pencil, Trash2 } from "lucide-react";

import { DeleteMealDialog } from "@/components/meals/delete-meal-dialog";
import { EditMealDialog } from "@/components/meals/edit-meal-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMacro } from "@/lib/ingredients/format";
import type { Ingredient } from "@/lib/ingredients/types";
import { computeMealTotals } from "@/lib/meals/macros";
import type { Meal } from "@/lib/meals/types";

/**
 * Tabular view of every stored meal, with per-row edit and delete actions.
 * The macro columns are computed from the items on every render, so they
 * always reflect the current ingredient macros. Owns which dialog is open and
 * reports outcomes to a live region for screen readers.
 */
export function MealLibrary({
  meals,
  ingredients,
}: {
  meals: Meal[];
  ingredients: Ingredient[];
}) {
  const [editing, setEditing] = useState<Meal | null>(null);
  const [deleting, setDeleting] = useState<Meal | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const closeEditing = useCallback(() => setEditing(null), []);
  const closeDeleting = useCallback(() => setDeleting(null), []);
  const announceSaved = useCallback((name: string) => {
    setAnnouncement(`${name} updated in your meal library.`);
  }, []);
  const announceDeleted = useCallback((name: string) => {
    setAnnouncement(`${name} removed from your meal library.`);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meal library</CardTitle>
        <CardDescription>
          {meals.length === 0
            ? "Nothing saved yet"
            : `${meals.length} ${meals.length === 1 ? "meal" : "meals"}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {meals.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Your library is empty. Combine your ingredients into a meal to start
            planning.
          </p>
        ) : (
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead>Meal</TableHead>
                <TableHead className="w-20 text-right">kcal</TableHead>
                <TableHead className="w-20 text-right">Protein</TableHead>
                <TableHead className="w-20 text-right">Carbs</TableHead>
                <TableHead className="w-20 text-right">Fat</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meals.map((meal) => {
                const totals = computeMealTotals(meal);
                const items = meal.items
                  .map(
                    (item) =>
                      `${item.ingredient.name} (${formatMacro(item.grams)} g)`,
                  )
                  .join(", ");

                return (
                  <TableRow key={meal.id}>
                    <TableCell className="font-medium">
                      <div className="truncate" title={meal.name}>
                        {meal.name}
                      </div>
                      <div
                        className="text-muted-foreground truncate text-sm font-normal"
                        title={items}
                      >
                        {items}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMacro(totals.calories)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMacro(totals.protein)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMacro(totals.carbs)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMacro(totals.fat)}
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${meal.name}`}
                        onClick={() => setEditing(meal)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${meal.name}`}
                        onClick={() => setDeleting(meal)}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableCaption>
              Totals are computed from the ingredients listed.
            </TableCaption>
          </Table>
        )}
      </CardContent>

      {editing ? (
        <EditMealDialog
          key={editing.id}
          meal={editing}
          ingredients={ingredients}
          onClose={closeEditing}
          onSaved={announceSaved}
        />
      ) : null}

      {deleting ? (
        <DeleteMealDialog
          key={deleting.id}
          meal={deleting}
          onClose={closeDeleting}
          onDeleted={announceDeleted}
        />
      ) : null}

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </Card>
  );
}
