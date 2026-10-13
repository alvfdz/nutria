-- CreateTable
CREATE TABLE "plan_meals" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "mealSlotId" UUID NOT NULL,
    "mealId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_meals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_meals_date_idx" ON "plan_meals"("date");

-- CreateIndex
CREATE INDEX "plan_meals_mealSlotId_idx" ON "plan_meals"("mealSlotId");

-- CreateIndex
CREATE INDEX "plan_meals_mealId_idx" ON "plan_meals"("mealId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_meals_date_mealSlotId_mealId_key" ON "plan_meals"("date", "mealSlotId", "mealId");

-- AddForeignKey
ALTER TABLE "plan_meals" ADD CONSTRAINT "plan_meals_mealSlotId_fkey" FOREIGN KEY ("mealSlotId") REFERENCES "meal_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_meals" ADD CONSTRAINT "plan_meals_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
