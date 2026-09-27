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

export function IngredientList({
  ingredients,
}: {
  ingredients: Ingredient[];
}) {
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
                </TableRow>
              ))}
            </TableBody>
            <TableCaption>All values are per 100 g of product.</TableCaption>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
