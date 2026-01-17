-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'CONTRACTOR');

-- CreateEnum
CREATE TYPE "UIMode" AS ENUM ('MAKER', 'MANAGER');

-- CreateEnum
CREATE TYPE "PitchStatus" AS ENUM ('OPEN', 'LOCKED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('FEATURE', 'BUG', 'DEBT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('BACKLOG', 'READY', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AndonTrigger" AS ENUM ('CI_PIPELINE', 'COVERAGE_DROP', 'TEST_FAILURE', 'DEPLOYMENT_FAILURE', 'USER_MANUAL', 'MONITORING_ALERT');

-- CreateEnum
CREATE TYPE "AndonSeverity" AS ENUM ('WARNING', 'STOP_LINE');

-- CreateEnum
CREATE TYPE "AndonStatus" AS ENUM ('ACTIVE', 'CLAIMED', 'SWARMING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "AgreementType" AS ENUM ('PIIAA', 'NDA', 'CONTRACTOR_IP');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('PENDING', 'SENT', 'VIEWED', 'SIGNED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "GrantType" AS ENUM ('ISO', 'NSO', 'RSA', 'RSU');

-- CreateEnum
CREATE TYPE "VestingStatus" AS ENUM ('PENDING_START', 'ACTIVE', 'PAUSED', 'TERMINATED', 'FULLY_VESTED');

-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('REVENUE', 'COGS', 'OPEX', 'PAYROLL', 'TAX', 'TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "CostType" AS ENUM ('COGS_HOSTING', 'COGS_SUPPORT', 'COGS_THIRD_PARTY', 'OPEX_MARKETING', 'OPEX_SALES', 'OPEX_RD', 'OPEX_GA');

-- CreateEnum
CREATE TYPE "TreeType" AS ENUM ('ISSUE', 'HYPOTHESIS', 'OPTION');

-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('UNIT_ECONOMICS', 'VELOCITY', 'REVENUE', 'CUSTOM_QUERY');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('PRAISE', 'CONSTRUCTIVE', 'PERFORMANCE_REVIEW', 'ONE_ON_ONE');

-- CreateEnum
CREATE TYPE "CandorQuadrant" AS ENUM ('RADICAL_CANDOR', 'RUINOUS_EMPATHY', 'OBNOXIOUS_AGGRESSION', 'MANIPULATIVE_INSINCERITY');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "featureRatio" INTEGER NOT NULL DEFAULT 60,
    "bugRatio" INTEGER NOT NULL DEFAULT 20,
    "debtRatio" INTEGER NOT NULL DEFAULT 20,
    "taktTimeHours" DOUBLE PRECISION,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "preferredMode" "UIMode" NOT NULL DEFAULT 'MANAGER',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionPitch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "capacityPoints" INTEGER NOT NULL,
    "currentLoad" INTEGER NOT NULL DEFAULT 0,
    "status" "PitchStatus" NOT NULL DEFAULT 'OPEN',
    "featurePoints" INTEGER NOT NULL DEFAULT 0,
    "bugPoints" INTEGER NOT NULL DEFAULT 0,
    "debtPoints" INTEGER NOT NULL DEFAULT 0,
    "demandUnitsExpected" INTEGER,
    "demandUnitsActual" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionPitch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pitchId" TEXT,
    "assigneeId" TEXT,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "taskType" "TaskType" NOT NULL,
    "storyPoints" INTEGER NOT NULL,
    "priorityScore" DECIMAL(5,2) NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'BACKLOG',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "inReviewAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalIdleMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastIdleStart" TIMESTAMP(3),
    "estimatedHours" DOUBLE PRECISION,
    "hourlyRate" DECIMAL(10,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VelocitySnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pitchId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedPoints" INTEGER NOT NULL,
    "pitchDurationHours" DOUBLE PRECISION NOT NULL,
    "featurePoints" INTEGER NOT NULL,
    "bugPoints" INTEGER NOT NULL,
    "debtPoints" INTEGER NOT NULL,

    CONSTRAINT "VelocitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AndonEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "triggerSource" "AndonTrigger" NOT NULL,
    "severityLevel" "AndonSeverity" NOT NULL,
    "status" "AndonStatus" NOT NULL DEFAULT 'ACTIVE',
    "commitHash" TEXT,
    "commitAuthor" TEXT,
    "branchName" TEXT,
    "pipelineUrl" TEXT,
    "errorLog" TEXT,
    "coveragePercent" DOUBLE PRECISION,
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "swarmChannelId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "rootCause" TEXT,
    "preventionAction" TEXT,
    "mttrMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AndonEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemHealth" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "HealthStatus" NOT NULL DEFAULT 'GREEN',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeIncidentCount" INTEGER NOT NULL DEFAULT 0,
    "mainBranchLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockReason" TEXT,

    CONSTRAINT "SystemHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "flagKey" TEXT NOT NULL,
    "flagName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deployedAt" TIMESTAMP(3),
    "adoptionPercent" DOUBLE PRECISION,
    "lastMeasuredAt" TIMESTAMP(3),
    "isStale" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IpAgreement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentType" "AgreementType" NOT NULL DEFAULT 'PIIAA',
    "status" "AgreementStatus" NOT NULL DEFAULT 'PENDING',
    "signedDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "documentUrl" TEXT,
    "docusignEnvelopeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IpAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VestingGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "grantType" "GrantType" NOT NULL DEFAULT 'ISO',
    "totalShares" INTEGER NOT NULL,
    "vestedShares" INTEGER NOT NULL DEFAULT 0,
    "exercisedShares" INTEGER NOT NULL DEFAULT 0,
    "strikePrice" DECIMAL(10,4) NOT NULL,
    "grantDate" TIMESTAMP(3) NOT NULL,
    "cliffDate" TIMESTAMP(3) NOT NULL,
    "vestingEndDate" TIMESTAMP(3) NOT NULL,
    "vestingMonths" INTEGER NOT NULL DEFAULT 48,
    "cliffMonths" INTEGER NOT NULL DEFAULT 12,
    "is83bFiled" BOOLEAN NOT NULL DEFAULT false,
    "election83bDeadline" TIMESTAMP(3),
    "election83bFiledAt" TIMESTAMP(3),
    "cliffApproved" BOOLEAN NOT NULL DEFAULT false,
    "cliffApprovalDate" TIMESTAMP(3),
    "cliffApprovalNotes" TEXT,
    "singleTriggerAccel" BOOLEAN NOT NULL DEFAULT false,
    "doubleTriggerAccel" BOOLEAN NOT NULL DEFAULT false,
    "accelerationPercent" INTEGER,
    "status" "VestingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VestingGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plaidTransactionId" TEXT,
    "accountId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "category" "TransactionCategory" NOT NULL,
    "subcategory" TEXT,
    "isAutoCategorized" BOOLEAN NOT NULL DEFAULT false,
    "confidenceScore" DOUBLE PRECISION,
    "costType" "CostType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyUnitEconomics" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "salesMarketingExpense" DECIMAL(12,2) NOT NULL,
    "newCustomersAcquired" INTEGER NOT NULL,
    "cacValue" DECIMAL(10,2) NOT NULL,
    "arpa" DECIMAL(10,2) NOT NULL,
    "grossMarginPercent" DECIMAL(5,4) NOT NULL,
    "churnRate" DECIMAL(5,4) NOT NULL,
    "ltvValue" DECIMAL(10,2) NOT NULL,
    "ltvCacRatio" DECIMAL(5,2) NOT NULL,
    "cacPaybackMonths" DECIMAL(5,2) NOT NULL,
    "cashBalance" DECIMAL(14,2) NOT NULL,
    "burnRate" DECIMAL(12,2) NOT NULL,
    "runwayMonths" DECIMAL(5,2) NOT NULL,
    "growthRatePercent" DECIMAL(5,2) NOT NULL,
    "profitMarginPercent" DECIMAL(5,2) NOT NULL,
    "ruleOf40Score" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyUnitEconomics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CacAttribution" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "period" DATE NOT NULL,
    "engineeringHoursTotal" DOUBLE PRECISION NOT NULL,
    "engineeringHoursGrowth" DOUBLE PRECISION NOT NULL,
    "engineeringHoursRetention" DOUBLE PRECISION NOT NULL,
    "engineeringCostTotal" DECIMAL(12,2) NOT NULL,
    "allocatedToCac" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CacAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "velocityTrend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "andonEventsCount" INTEGER NOT NULL DEFAULT 0,
    "mttrMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wasteScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "mrr" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cac" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ltv" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ltvCacRatio" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "runwayMonths" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "churnRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "teamSize" INTEGER NOT NULL DEFAULT 0,
    "openRoles" INTEGER NOT NULL DEFAULT 0,
    "feedbackCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueTree" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rootQuestion" TEXT NOT NULL,
    "treeType" "TreeType" NOT NULL DEFAULT 'ISSUE',
    "aiSuggestionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueTree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueTreeNode" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "parentId" TEXT,
    "label" TEXT NOT NULL,
    "hypothesis" TEXT,
    "notes" TEXT,
    "dataSourceType" "DataSourceType",
    "dataSourceQuery" TEXT,
    "liveValue" DECIMAL(14,2),
    "lastRefreshed" TIMESTAMP(3),
    "aiMeceWarning" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueTreeNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SevenSDiagnostic" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "surveyDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondentCount" INTEGER NOT NULL,
    "strategyScore" DECIMAL(3,1) NOT NULL,
    "structureScore" DECIMAL(3,1) NOT NULL,
    "systemsScore" DECIMAL(3,1) NOT NULL,
    "sharedValuesScore" DECIMAL(3,1) NOT NULL,
    "styleScore" DECIMAL(3,1) NOT NULL,
    "staffScore" DECIMAL(3,1) NOT NULL,
    "skillsScore" DECIMAL(3,1) NOT NULL,
    "systemLinks" JSONB,
    "misalignmentFlags" TEXT[],
    "recommendations" TEXT[],

    CONSTRAINT "SevenSDiagnostic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobScorecard" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "outcomes" TEXT[],
    "competencies" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobScorecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateEvaluation" (
    "id" TEXT NOT NULL,
    "scorecardId" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL,
    "candidateEmail" TEXT,
    "jobHistory" JSONB,
    "externalLocusCount" INTEGER NOT NULL DEFAULT 0,
    "tenurePattern" TEXT,
    "overallScore" INTEGER,
    "riskFlags" TEXT[],
    "strengths" TEXT[],
    "recommendation" TEXT,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "feedbackType" "FeedbackType" NOT NULL,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "careScore" DECIMAL(3,2),
    "challengeScore" DECIMAL(3,2),
    "candorQuadrant" "CandorQuadrant",
    "toneSuggestion" TEXT,
    "contributesToOrgStats" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackHealthMetrics" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "period" DATE NOT NULL,
    "totalFeedbackCount" INTEGER NOT NULL,
    "praiseCount" INTEGER NOT NULL,
    "constructiveCount" INTEGER NOT NULL,
    "radicalCandorPercent" DOUBLE PRECISION NOT NULL,
    "ruinousEmpathyPercent" DOUBLE PRECISION NOT NULL,
    "aggressionPercent" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackHealthMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DtoActivityEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "costAllocation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "caseId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DtoActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionMarket" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "oracleType" TEXT NOT NULL,
    "oracleSourceUrl" TEXT,
    "resolutionLogic" TEXT,
    "expiryTimestamp" TIMESTAMP(3) NOT NULL,
    "liquidityParameter" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedOutcome" TEXT,
    "yesTokens" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "noTokens" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketTrade" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "usdAmount" DOUBLE PRECISION NOT NULL,
    "executionTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketUserBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "yesShares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "noShares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usdBalance" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketUserBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QvSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "initialCreditsPerVoter" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QvSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QvOption" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "totalCost" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QvOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QvBallot" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "initialCredits" INTEGER NOT NULL,
    "totalCost" INTEGER NOT NULL,
    "remainingCredits" INTEGER NOT NULL,
    "signature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QvBallot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QvVote" (
    "id" TEXT NOT NULL,
    "ballotId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "voteCount" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,

    CONSTRAINT "QvVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "vendor" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "justification" TEXT NOT NULL,
    "historicalSpend" DOUBLE PRECISION,
    "historicalROI" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "agentConversation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZombieSpendAlert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceName" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "monthlyCost" DOUBLE PRECISION NOT NULL,
    "lastActiveDate" TIMESTAMP(3),
    "daysSinceActive" INTEGER NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DETECTED',
    "potentialSavings" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZombieSpendAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "ProductionPitch_organizationId_startTime_idx" ON "ProductionPitch"("organizationId", "startTime");

-- CreateIndex
CREATE INDEX "ProductionPitch_status_idx" ON "ProductionPitch"("status");

-- CreateIndex
CREATE INDEX "Task_organizationId_status_idx" ON "Task"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Task_pitchId_idx" ON "Task"("pitchId");

-- CreateIndex
CREATE INDEX "Task_taskType_idx" ON "Task"("taskType");

-- CreateIndex
CREATE INDEX "VelocitySnapshot_organizationId_recordedAt_idx" ON "VelocitySnapshot"("organizationId", "recordedAt");

-- CreateIndex
CREATE INDEX "AndonEvent_organizationId_status_idx" ON "AndonEvent"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AndonEvent_organizationId_createdAt_idx" ON "AndonEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemHealth_organizationId_key" ON "SystemHealth"("organizationId");

-- CreateIndex
CREATE INDEX "SystemHealth_status_idx" ON "SystemHealth"("status");

-- CreateIndex
CREATE INDEX "FeatureFlag_organizationId_isStale_idx" ON "FeatureFlag"("organizationId", "isStale");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_organizationId_flagKey_key" ON "FeatureFlag"("organizationId", "flagKey");

-- CreateIndex
CREATE UNIQUE INDEX "IpAgreement_userId_key" ON "IpAgreement"("userId");

-- CreateIndex
CREATE INDEX "IpAgreement_organizationId_status_idx" ON "IpAgreement"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VestingGrant_userId_key" ON "VestingGrant"("userId");

-- CreateIndex
CREATE INDEX "VestingGrant_organizationId_cliffDate_idx" ON "VestingGrant"("organizationId", "cliffDate");

-- CreateIndex
CREATE INDEX "VestingGrant_status_idx" ON "VestingGrant"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_plaidTransactionId_key" ON "Transaction"("plaidTransactionId");

-- CreateIndex
CREATE INDEX "Transaction_organizationId_date_idx" ON "Transaction"("organizationId", "date");

-- CreateIndex
CREATE INDEX "Transaction_category_idx" ON "Transaction"("category");

-- CreateIndex
CREATE INDEX "Transaction_costType_idx" ON "Transaction"("costType");

-- CreateIndex
CREATE INDEX "DailyUnitEconomics_organizationId_date_idx" ON "DailyUnitEconomics"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyUnitEconomics_organizationId_date_key" ON "DailyUnitEconomics"("organizationId", "date");

-- CreateIndex
CREATE INDEX "CacAttribution_organizationId_period_idx" ON "CacAttribution"("organizationId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "CacAttribution_organizationId_period_key" ON "CacAttribution"("organizationId", "period");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_organizationId_date_idx" ON "AnalyticsSnapshot"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSnapshot_organizationId_date_key" ON "AnalyticsSnapshot"("organizationId", "date");

-- CreateIndex
CREATE INDEX "IssueTree_organizationId_idx" ON "IssueTree"("organizationId");

-- CreateIndex
CREATE INDEX "IssueTreeNode_treeId_parentId_idx" ON "IssueTreeNode"("treeId", "parentId");

-- CreateIndex
CREATE INDEX "SevenSDiagnostic_organizationId_surveyDate_idx" ON "SevenSDiagnostic"("organizationId", "surveyDate");

-- CreateIndex
CREATE INDEX "JobScorecard_organizationId_idx" ON "JobScorecard"("organizationId");

-- CreateIndex
CREATE INDEX "CandidateEvaluation_scorecardId_status_idx" ON "CandidateEvaluation"("scorecardId", "status");

-- CreateIndex
CREATE INDEX "FeedbackEntry_organizationId_giverId_idx" ON "FeedbackEntry"("organizationId", "giverId");

-- CreateIndex
CREATE INDEX "FeedbackEntry_giverId_recipientId_idx" ON "FeedbackEntry"("giverId", "recipientId");

-- CreateIndex
CREATE INDEX "FeedbackHealthMetrics_organizationId_period_idx" ON "FeedbackHealthMetrics"("organizationId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackHealthMetrics_organizationId_period_key" ON "FeedbackHealthMetrics"("organizationId", "period");

-- CreateIndex
CREATE INDEX "DtoActivityEvent_organizationId_timestamp_idx" ON "DtoActivityEvent"("organizationId", "timestamp");

-- CreateIndex
CREATE INDEX "DtoActivityEvent_caseId_idx" ON "DtoActivityEvent"("caseId");

-- CreateIndex
CREATE INDEX "DtoActivityEvent_actorId_idx" ON "DtoActivityEvent"("actorId");

-- CreateIndex
CREATE INDEX "PredictionMarket_organizationId_status_idx" ON "PredictionMarket"("organizationId", "status");

-- CreateIndex
CREATE INDEX "PredictionMarket_expiryTimestamp_idx" ON "PredictionMarket"("expiryTimestamp");

-- CreateIndex
CREATE INDEX "MarketTrade_marketId_executionTime_idx" ON "MarketTrade"("marketId", "executionTime");

-- CreateIndex
CREATE INDEX "MarketTrade_buyerId_idx" ON "MarketTrade"("buyerId");

-- CreateIndex
CREATE INDEX "MarketUserBalance_marketId_idx" ON "MarketUserBalance"("marketId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketUserBalance_userId_marketId_key" ON "MarketUserBalance"("userId", "marketId");

-- CreateIndex
CREATE INDEX "QvSession_organizationId_status_idx" ON "QvSession"("organizationId", "status");

-- CreateIndex
CREATE INDEX "QvSession_expiresAt_idx" ON "QvSession"("expiresAt");

-- CreateIndex
CREATE INDEX "QvOption_sessionId_idx" ON "QvOption"("sessionId");

-- CreateIndex
CREATE INDEX "QvBallot_sessionId_idx" ON "QvBallot"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "QvBallot_sessionId_voterId_key" ON "QvBallot"("sessionId", "voterId");

-- CreateIndex
CREATE INDEX "QvVote_ballotId_idx" ON "QvVote"("ballotId");

-- CreateIndex
CREATE INDEX "QvVote_optionId_idx" ON "QvVote"("optionId");

-- CreateIndex
CREATE INDEX "BudgetRequest_organizationId_status_idx" ON "BudgetRequest"("organizationId", "status");

-- CreateIndex
CREATE INDEX "BudgetRequest_requesterId_idx" ON "BudgetRequest"("requesterId");

-- CreateIndex
CREATE INDEX "ZombieSpendAlert_organizationId_status_idx" ON "ZombieSpendAlert"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ZombieSpendAlert_potentialSavings_idx" ON "ZombieSpendAlert"("potentialSavings");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPitch" ADD CONSTRAINT "ProductionPitch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "ProductionPitch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AndonEvent" ADD CONSTRAINT "AndonEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AndonEvent" ADD CONSTRAINT "AndonEvent_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AndonEvent" ADD CONSTRAINT "AndonEvent_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemHealth" ADD CONSTRAINT "SystemHealth_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpAgreement" ADD CONSTRAINT "IpAgreement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpAgreement" ADD CONSTRAINT "IpAgreement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VestingGrant" ADD CONSTRAINT "VestingGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VestingGrant" ADD CONSTRAINT "VestingGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyUnitEconomics" ADD CONSTRAINT "DailyUnitEconomics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueTree" ADD CONSTRAINT "IssueTree_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueTreeNode" ADD CONSTRAINT "IssueTreeNode_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "IssueTree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueTreeNode" ADD CONSTRAINT "IssueTreeNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "IssueTreeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SevenSDiagnostic" ADD CONSTRAINT "SevenSDiagnostic_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobScorecard" ADD CONSTRAINT "JobScorecard_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateEvaluation" ADD CONSTRAINT "CandidateEvaluation_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "JobScorecard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackEntry" ADD CONSTRAINT "FeedbackEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackEntry" ADD CONSTRAINT "FeedbackEntry_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackEntry" ADD CONSTRAINT "FeedbackEntry_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketTrade" ADD CONSTRAINT "MarketTrade_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "PredictionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketUserBalance" ADD CONSTRAINT "MarketUserBalance_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "PredictionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QvOption" ADD CONSTRAINT "QvOption_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QvSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QvBallot" ADD CONSTRAINT "QvBallot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QvSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QvVote" ADD CONSTRAINT "QvVote_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "QvBallot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QvVote" ADD CONSTRAINT "QvVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "QvOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
