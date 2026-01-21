-- AlterTable
ALTER TABLE "BudgetRequest" ADD COLUMN     "predictionMarketId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "rawQvScore" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "teamId" TEXT;

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "volatilityFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationRun" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "budgetRequestId" TEXT,
    "volatilityFactorUsed" DOUBLE PRECISION NOT NULL,
    "p50" DOUBLE PRECISION NOT NULL,
    "p90" DOUBLE PRECISION NOT NULL,
    "predictedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualDuration" DOUBLE PRECISION,
    "calibrationApplied" BOOLEAN NOT NULL DEFAULT false,
    "calibratedAt" TIMESTAMP(3),

    CONSTRAINT "SimulationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_organizationId_name_key" ON "Team"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationRun_budgetRequestId_key" ON "SimulationRun"("budgetRequestId");

-- CreateIndex
CREATE INDEX "SimulationRun_teamId_idx" ON "SimulationRun"("teamId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationRun" ADD CONSTRAINT "SimulationRun_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationRun" ADD CONSTRAINT "SimulationRun_budgetRequestId_fkey" FOREIGN KEY ("budgetRequestId") REFERENCES "BudgetRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetRequest" ADD CONSTRAINT "BudgetRequest_predictionMarketId_fkey" FOREIGN KEY ("predictionMarketId") REFERENCES "PredictionMarket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
