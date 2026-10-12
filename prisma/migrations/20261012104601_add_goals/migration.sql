-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "proteinPct" DOUBLE PRECISION NOT NULL,
    "carbsPct" DOUBLE PRECISION NOT NULL,
    "fatPct" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_slots" (
    "id" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "goalsId" UUID NOT NULL,

    CONSTRAINT "meal_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_slots_goalsId_sortOrder_key" ON "meal_slots"("goalsId", "sortOrder");

-- AddForeignKey
ALTER TABLE "meal_slots" ADD CONSTRAINT "meal_slots_goalsId_fkey" FOREIGN KEY ("goalsId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
