-- CreateTable
CREATE TABLE "meals" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_items" (
    "id" UUID NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "mealId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,

    CONSTRAINT "meal_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meal_items_mealId_idx" ON "meal_items"("mealId");

-- CreateIndex
CREATE INDEX "meal_items_ingredientId_idx" ON "meal_items"("ingredientId");

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
