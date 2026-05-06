-- CreateTable
CREATE TABLE "budget_months" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "compacted" BOOLEAN NOT NULL DEFAULT false,
    "compactedSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_months_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_items" (
    "id" TEXT NOT NULL,
    "monthId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "amount" INTEGER,
    "amountCarried" BOOLEAN NOT NULL DEFAULT false,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "installmentTotal" INTEGER,
    "installmentNumber" INTEGER,
    "installmentGroupId" TEXT,
    "notes" TEXT,
    "linkedPocketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "budget_months_userId_year_month_key" ON "budget_months"("userId", "year", "month");

-- AddForeignKey
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "budget_months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "budget_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
