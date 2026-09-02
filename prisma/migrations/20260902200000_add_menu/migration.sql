-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "weekday" INTEGER,
    "date" DATE,
    "meal" "Meal" NOT NULL,
    "items" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuItem_messId_idx" ON "MenuItem"("messId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_messId_weekday_meal_key" ON "MenuItem"("messId", "weekday", "meal");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_messId_date_meal_key" ON "MenuItem"("messId", "date", "meal");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
