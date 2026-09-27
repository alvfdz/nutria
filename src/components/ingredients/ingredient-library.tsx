"use client";

import { useCallback, useState } from "react";

import { Pencil, Trash2 } from "lucide-react";

import { DeleteIngredientDialog } from "@/components/ingredients/delete-ingredient-dialog";
import { EditIngredientDialog } from "@/components/ingredients/edit-ingredient-dialog";
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

export function IngredientLibrary({
  ingredients,
}: {
  ingredients: Ingredient[];
}) {
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [deleting, setDeleting] = useState<Ingredient | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const closeEditing = useCallback(() => setEditing(null), []);
  const closeDeleting = useCallback(() => setDeleting(null), []);
  const announceSaved = useCallback(
    (name: string) => {
      setAnnouncement(`${name} updated in your ingredient library.`);
    },
    [],
  );
  const announceDeleted = useCallback((name: string) => {
    setAnnouncement(`${name} removed from your ingredient library.`);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingredient library</CardTitle>
        <CardDescription>
          {ingredients.length === 0
            ? "Nothing saved yet"
            : `${ingredients.length} ${ingredients.length === 1 ? "ingredient" : "ingredients"}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {ingredients.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Your library is empty. Add an ingredient to start building meals.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead className="text-right">kcal</TableHead>
                <TableHead className="text-right">Protein</TableHead>
                <TableHead className="text-right">Carbs</TableHead>
                <TableHead className="text-right">Fat</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredients.map((ingredient) => (
                <TableRow key={ingredient.id}>
                  <TableCell className="font-medium">
                    {ingredient.name}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMacro(ingredient.caloriesPer100g)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMacro(ingredient.proteinPer100g)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMacro(ingredient.carbsPer100g)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMacro(ingredient.fatPer100g)}
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${ingredient.name}`}
                      onClick={() => setEditing(ingredient)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${ingredient.name}`}
                      onClick={() => setDeleting(ingredient)}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableCaption>All values are per 100 g of product.</TableCaption>
          </Table>
        )}
      </CardContent>

      {editing ? (
        <EditIngredientDialog
          key={editing.id}
          ingredient={editing}
          onClose={closeEditing}
          onSaved={announceSaved}
        />
      ) : null}

      {deleting ? (
        <DeleteIngredientDialog
          key={deleting.id}
          ingredient={deleting}
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
