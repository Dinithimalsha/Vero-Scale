-- CreateTable
CREATE TABLE "CompliancePolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompliancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceAuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "policyType" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "violations" JSONB,
    "warnings" JSONB,
    "inputMap" JSONB,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompliancePolicy_organizationId_enabled_idx" ON "CompliancePolicy"("organizationId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "CompliancePolicy_organizationId_type_key" ON "CompliancePolicy"("organizationId", "type");

-- CreateIndex
CREATE INDEX "ComplianceAuditLog_organizationId_timestamp_idx" ON "ComplianceAuditLog"("organizationId", "timestamp");

-- CreateIndex
CREATE INDEX "ComplianceAuditLog_policyType_idx" ON "ComplianceAuditLog"("policyType");

-- CreateIndex
CREATE INDEX "ComplianceAuditLog_decision_idx" ON "ComplianceAuditLog"("decision");
