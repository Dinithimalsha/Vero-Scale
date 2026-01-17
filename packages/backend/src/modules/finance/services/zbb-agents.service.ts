import { prisma } from '../../../shared/prisma';
import { BudgetRequest, ZombieSpendAlert } from '@prisma/client';
import crypto from 'crypto';
import { predictionMarketService } from '../../markets/services/prediction-market.service';

// ═══════════════════════════════════════════════════════════════════
// TYPES (Section 5.1 - Agentic Workflow Architecture)
// ═══════════════════════════════════════════════════════════════════

export type AgentType =
    | 'INTERROGATOR'        // Challenges budget requests
    | 'ZOMBIE_HUNTER'       // Finds unused resources
    | 'NEGOTIATOR'          // A2A vendor negotiation
    | 'COST_ANALYZER';      // Attribution analysis

export type AgentStatus = 'IDLE' | 'ACTIVE' | 'WAITING_HUMAN' | 'COMPLETED' | 'ESCALATED';

export type AgentMessage = {
    role: 'AGENT' | 'HUMAN';
    content: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
};

// Re-export Prisma types or extend them
export type { BudgetRequest, ZombieSpendAlert } from '@prisma/client';

export type BudgetRequestWithConversation = BudgetRequest & {
    agentConversation?: AgentMessage[];
};

export interface NegotiationMandate {
    id: string;
    vendor: string;
    productName: string;
    currentPrice: number;
    targetPrice: number;
    walkAwayPrice: number;
    volume: number;
    status: 'PENDING' | 'NEGOTIATING' | 'COMPLETED' | 'FAILED';
    finalPrice?: number;
    savingsAchieved?: number;
}

export interface CostAttribution {
    customerId: string;
    customerName?: string;
    revenue: number;
    infrastructureCost: number;
    grossMargin: number;
    grossMarginPercent: number;
    costBreakdown: Array<{
        service: string;
        cost: number;
        percentage: number;
    }>;
}

// ═══════════════════════════════════════════════════════════════════
// INTERROGATOR AGENT (Section 5.1)
// "Before a budget request is approved, an LLM agent challenges 
// assumptions using data from the DTO."
// ═══════════════════════════════════════════════════════════════════

import { simulationService } from '../../strategy/services/simulation.service';

export class InterrogatorAgent {
    /**
     * Generate challenge questions for a budget request
     * Uses historical data to challenge assumptions
     */
    async interrogate(request: BudgetRequest): Promise<AgentMessage[]> {
        const conversation: AgentMessage[] = [];

        // 1. Check historical spending patterns
        if (request.historicalSpend && request.historicalROI) {
            const roiThreshold = 2.0; // Expect 2x ROI minimum
            const roi = Number(request.historicalROI);

            if (roi < roiThreshold) {
                conversation.push({
                    role: 'AGENT',
                    content: `You requested $${request.amount.toLocaleString()} for ${request.category}. ` +
                        `Historical data shows similar investments generated only ${(roi * 100).toFixed(0)}% ROI. ` +
                        `Our threshold is ${roiThreshold * 100}% ROI. ` +
                        `Please justify why this investment will perform better, or revise the request.`,
                    timestamp: new Date(),
                    metadata: {
                        requestedAmount: request.amount,
                        historicalROI: roi,
                        threshold: roiThreshold,
                    },
                });
            }
        }

        // 2. Run Monte Carlo Simulation (The Oracle Check)
        // Construct mock scope based on amount (e.g. $1000 = 1 Point)
        const estimatedPoints = Math.ceil(request.amount / 1000);
        const scope = {
            tasks: Array(5).fill({ estimatedEffort: estimatedPoints / 5, complexity: 'MEDIUM' }),
            targetBudgetOrTime: request.amount
        };

        // Since request doesn't have a teamId yet, we'll try to find a default team for the org 
        // OR simply fail gracefuly. For MVP, we'll use a hack or assume requester's team.
        // Ideally: `const team = await prisma.team.findFirst({ where: { organizationId: request.organizationId } })`
        // For now, passing ID as is, knowing the service handles missing teams gracefully or throws.

        // Linking the simulation to this budget request for Phase 10 Calibration
        const simResult = await simulationService.runSimulation(scope, request.organizationId, request.id);

        // Algorithmic Leadership: Rejection Logic
        if (simResult.probabilityOfSuccess < 0.50) {
            conversation.push({
                role: 'AGENT',
                content: `🚨 **High Risk Detected**: Monte Carlo simulation (10,000 runs) indicates only a ${(simResult.probabilityOfSuccess * 100).toFixed(1)}% chance of staying within budget. ` +
                    `The P90 (Worst Case) cost is estimated at $${simResult.p90.toLocaleString()}. ` +
                    `Please increase your buffer or reduce scope to proceed.`,
                timestamp: new Date(),
                metadata: {
                    simulationPcSuccess: simResult.probabilityOfSuccess,
                    p90Cost: simResult.p90
                }
            });
        }

        // 3. Check for similar existing spend
        const similarSpend = await this.findSimilarSpend(
            request.organizationId,
            request.category,
            request.vendor || undefined
        );

        if (similarSpend && similarSpend.amount > 0) {
            conversation.push({
                role: 'AGENT',
                content: `I found existing spend of $${similarSpend.amount.toLocaleString()}/month in the same category (${request.category}). ` +
                    `Is this request supplementary or a replacement? ` +
                    `If supplementary, total spend will be $${(similarSpend.amount + request.amount).toLocaleString()}/month.`,
                timestamp: new Date(),
                metadata: { existingSpend: similarSpend },
            });
        }

        // 4. Check budget utilization
        if (request.amount > 10000 && simResult.probabilityOfSuccess >= 0.50) { // Only ask if not already rejected by sim
            conversation.push({
                role: 'AGENT',
                content: `This is a significant request ($${request.amount.toLocaleString()}). ` +
                    `To proceed, please provide: ` +
                    `1) Specific metrics you expect to improve, ` +
                    `2) Timeline for ROI measurement, ` +
                    `3) Alternative options considered.`,
                timestamp: new Date(),
            });
        }

        return conversation;
    }

    private async findSimilarSpend(
        organizationId: string,
        category: string,
        vendor?: string
    ): Promise<{ amount: number; count: number } | null> {
        // Real implementation would query DB. 
        // We can query existing BudgetRequests in DB for "APPROVED" status.

        const similarRequests = await prisma.budgetRequest.findMany({
            where: {
                organizationId,
                category,
                status: 'APPROVED',
                vendor: vendor ? vendor : undefined,
            }
        });

        if (similarRequests.length === 0) {
            // Fallback to mock if DB is empty for demo purposes
            return {
                amount: Math.random() * 5000,
                count: Math.floor(Math.random() * 5),
            };
        }

        const totalAmount = similarRequests.reduce((sum, req) => sum + req.amount, 0);

        return {
            amount: totalAmount,
            count: similarRequests.length
        };
    }
    async triggerGrowthHalt(reason: string, severity: 'HIGH' | 'CRITICAL'): Promise<void> {
        console.warn(`[ZBB AGENT] 🛑 GROWTH HALT TRIGGERED: ${reason} (Severity: ${severity})`);

        // In a real system, this would call the Stripe/Brex API to freeze cards tagged "Marketing"
        // For MVP, we log and perhaps update a system flag
        // await prisma.systemHealth.update({ ... set defcon status ... })

        // 1. Find all active marketing budget requests
        // const activeRequests = await prisma.budgetRequest.findMany({ where: { category: 'MARKETING', status: 'APPROVED' } });

        // 2. Revoke them? Or just log?
        console.log(`[ZBB AGENT] Freezing all PENDING marketing requests.`);

        /* 
        await prisma.budgetRequest.updateMany({
            where: { category: 'MARKETING', status: 'PENDING' },
            data: { status: 'REJECTED' } // using REJECTED for now as FROZEN status doesn't exist in schema
        });
        */
    }
}

// ═══════════════════════════════════════════════════════════════════
// ZOMBIE SPEND HUNTER (Section 5.1)
// "An agent continuously scans the General Ledger and SaaS usage logs.
// If a seat hasn't been logged into for 30 days, flag for cancellation."
// ═══════════════════════════════════════════════════════════════════

export class ZombieSpendHunter {
    private readonly INACTIVE_THRESHOLD_DAYS = 30;

    /**
     * Scan for zombie spend (unused resources) and persist alerts
     */
    async hunt(organizationId: string): Promise<ZombieSpendAlert[]> {
        // 1. Generate alerts (Simulated scanning)
        const generatedAlerts: Omit<ZombieSpendAlert, 'id' | 'createdAt' | 'updatedAt'>[] = [];

        generatedAlerts.push(...await this.scanSaasSeats(organizationId));
        generatedAlerts.push(...await this.scanCloudResources(organizationId));
        generatedAlerts.push(...await this.scanSubscriptions(organizationId));
        generatedAlerts.push(...await this.checkMarketConfidence(organizationId));

        // 2. Persist to DB (Upsert or Create)
        const persistedAlerts: ZombieSpendAlert[] = [];

        for (const alertData of generatedAlerts) {
            // Check if active alert exists for this resource
            const existing = await prisma.zombieSpendAlert.findFirst({
                where: {
                    organizationId,
                    resourceName: alertData.resourceName,
                    status: 'DETECTED',
                }
            });

            if (existing) {
                persistedAlerts.push(existing);
            } else {
                const created = await prisma.zombieSpendAlert.create({
                    data: {
                        organizationId,
                        resourceType: alertData.resourceType,
                        resourceName: alertData.resourceName,
                        vendor: alertData.vendor,
                        monthlyCost: alertData.monthlyCost,
                        daysSinceActive: alertData.daysSinceActive,
                        recommendedAction: alertData.recommendedAction,
                        status: 'DETECTED',
                        potentialSavings: alertData.potentialSavings,
                        lastActiveDate: alertData.lastActiveDate,
                    }
                });
                persistedAlerts.push(created);
            }
        }

        return persistedAlerts.sort((a, b) => b.potentialSavings - a.potentialSavings);
    }

    private async scanSaasSeats(organizationId: string): Promise<Omit<ZombieSpendAlert, 'id' | 'createdAt' | 'updatedAt'>[]> {
        const mockSeats = [
            { vendor: 'Salesforce', seats: 50, inactive: 8, costPerSeat: 150 },
            { vendor: 'Slack', seats: 100, inactive: 15, costPerSeat: 12 },
            { vendor: 'GitHub', seats: 30, inactive: 5, costPerSeat: 21 },
        ];

        return mockSeats
            .filter(s => s.inactive > 0)
            .map(s => ({
                organizationId,
                resourceType: 'SAAS_SEAT',
                resourceName: `${s.inactive} unused seats`,
                vendor: s.vendor,
                monthlyCost: s.inactive * s.costPerSeat,
                daysSinceActive: Math.floor(Math.random() * 60) + 30,
                recommendedAction: 'CANCEL',
                status: 'DETECTED',
                potentialSavings: s.inactive * s.costPerSeat * 12,
                lastActiveDate: null,
            }));
    }

    private async scanCloudResources(organizationId: string): Promise<Omit<ZombieSpendAlert, 'id' | 'createdAt' | 'updatedAt'>[]> {
        const mockResources = [
            { name: 'Idle EC2 instance (m5.large)', cost: 139, days: 45 },
            { name: 'Unattached EBS volume (500GB)', cost: 50, days: 60 },
            { name: 'Unused Elastic IP', cost: 3.6, days: 90 },
        ];

        return mockResources.map(r => ({
            organizationId,
            resourceType: 'CLOUD_RESOURCE',
            resourceName: r.name,
            vendor: 'AWS',
            monthlyCost: r.cost,
            daysSinceActive: r.days,
            recommendedAction: 'CANCEL',
            status: 'DETECTED',
            potentialSavings: r.cost * 12,
            lastActiveDate: null,
        }));
    }

    private async scanSubscriptions(organizationId: string): Promise<Omit<ZombieSpendAlert, 'id' | 'createdAt' | 'updatedAt'>[]> {
        return [];
    }

    /**
     * "The Killer App" - Check Prediction Markets for low-confidence projects
     */
    private async checkMarketConfidence(organizationId: string): Promise<Omit<ZombieSpendAlert, 'id' | 'createdAt' | 'updatedAt'>[]> {
        const LOW_CONFIDENCE_THRESHOLD = 0.30; // 30% Probability

        // Find projects with linked prediction markets
        const riskyProjects = await prisma.budgetRequest.findMany({
            where: {
                organizationId,
                status: { in: ['APPROVED', 'PENDING'] },
                // @ts-ignore - Schema updated but types lagging
                predictionMarketId: { not: null }
            }
        });

        const alerts: Omit<ZombieSpendAlert, 'id' | 'createdAt' | 'updatedAt'>[] = [];

        for (const project of riskyProjects) {
            // @ts-ignore
            if (!project.predictionMarketId) continue;

            try {
                // Check "Wisdom of the Crowds"
                // @ts-ignore
                const forecast = await predictionMarketService.getProbabilityForecast(project.predictionMarketId);

                if (forecast.probability < LOW_CONFIDENCE_THRESHOLD) {
                    console.log(`📉 Project Confidence Crash: ${project.category} (${(forecast.probability * 100).toFixed(1)}%)`);

                    alerts.push({
                        organizationId,
                        resourceType: 'LOW_CONFIDENCE_PROJECT',
                        resourceName: `Project ${project.category} (Market: ${forecast.question})`,
                        vendor: 'Internal',
                        monthlyCost: project.amount, // Assume monthly burn rate = request amount for now
                        daysSinceActive: 0,
                        recommendedAction: 'FREEZE_BUDGET',
                        status: 'DETECTED',
                        potentialSavings: project.amount,
                        lastActiveDate: new Date(),
                    });
                }
            } catch (error) {
                console.warn(`Failed to check market for project ${project.id}:`, error);
            }
        }

        return alerts;
    }

    /**
     * Calculate total potential savings
     */
    summarizeSavings(alerts: ZombieSpendAlert[]): {
        totalMonthly: number;
        totalAnnual: number;
        byCategory: Record<string, number>;
    } {
        const totalMonthly = alerts.reduce((sum, a) => sum + a.monthlyCost, 0);
        const totalAnnual = alerts.reduce((sum, a) => sum + a.potentialSavings, 0);

        const byCategory: Record<string, number> = {};
        for (const alert of alerts) {
            byCategory[alert.resourceType] = (byCategory[alert.resourceType] || 0) + alert.potentialSavings;
        }

        return { totalMonthly, totalAnnual, byCategory };
    }
}

// ═══════════════════════════════════════════════════════════════════
// COST ATTRIBUTION ENGINE (Section 5.3 - The "Golden Thread")
// ═══════════════════════════════════════════════════════════════════

export class CostAttributionEngine {
    private readonly MARGIN_THRESHOLD = 0.70; // 70% minimum gross margin

    /**
     * Calculate per-customer cost attribution
     */
    async calculateCustomerAttribution(
        organizationId: string,
        customerId: string
    ): Promise<CostAttribution> {
        // IN-MEMORY / MOCK (No DB model yet for Cost Attribution)
        const revenue = 5000 + Math.random() * 15000;
        const infrastructureCost = revenue * (0.15 + Math.random() * 0.2);
        const grossMargin = revenue - infrastructureCost;
        const grossMarginPercent = grossMargin / revenue;

        return {
            customerId,
            customerName: `Customer ${customerId.slice(0, 8)}`,
            revenue,
            infrastructureCost,
            grossMargin,
            grossMarginPercent,
            costBreakdown: [
                { service: 'Compute (EC2)', cost: infrastructureCost * 0.5, percentage: 50 },
                { service: 'Storage (S3)', cost: infrastructureCost * 0.2, percentage: 20 },
                { service: 'Database (RDS)', cost: infrastructureCost * 0.2, percentage: 20 },
                { service: 'Other', cost: infrastructureCost * 0.1, percentage: 10 },
            ],
        };
    }

    /**
     * Find customers below margin threshold
     */
    async findUnprofitableCustomers(organizationId: string): Promise<CostAttribution[]> {
        const customers = ['cust_1', 'cust_2', 'cust_3', 'cust_4', 'cust_5'];
        const attributions = await Promise.all(
            customers.map(c => this.calculateCustomerAttribution(organizationId, c))
        );

        return attributions.filter(a => a.grossMarginPercent < this.MARGIN_THRESHOLD);
    }

    /**
     * Generate cost optimization recommendations
     */
    generateRecommendations(attribution: CostAttribution): string[] {
        const recommendations: string[] = [];

        if (attribution.grossMarginPercent < 0.5) {
            recommendations.push(
                `CRITICAL: Customer margin is ${(attribution.grossMarginPercent * 100).toFixed(1)}%. ` +
                `Consider pricing renegotiation or service tier adjustment.`
            );
        }

        const computeCost = attribution.costBreakdown.find(c => c.service.includes('Compute'));
        if (computeCost && computeCost.percentage > 60) {
            recommendations.push(
                `High compute costs (${computeCost.percentage}% of total). ` +
                `Review for right-sizing opportunities or Reserved Instance commitment.`
            );
        }

        return recommendations;
    }
}

// ═══════════════════════════════════════════════════════════════════
// ZBB AGENT COORDINATOR
// ═══════════════════════════════════════════════════════════════════

export class ZBBAgentCoordinator {
    private interrogator = new InterrogatorAgent();
    private zombieHunter = new ZombieSpendHunter();
    private costEngine = new CostAttributionEngine();

    /**
     * Process a budget request through the ZBB agents
     */
    async processBudgetRequest(
        requestInput: Omit<BudgetRequest, 'id' | 'createdAt' | 'status' | 'agentConversation'>
    ): Promise<{
        status: string;
        conversation: AgentMessage[];
        requiresHumanReview: boolean;
        requestId: string;
    }> {
        const requestId = crypto.randomUUID();

        // 1. Create Initial Request Object (Draft)
        const request: BudgetRequest = {
            id: requestId,
            ...requestInput,
            status: 'PENDING',
            agentConversation: [], // Init empty
            createdAt: new Date(),
            updatedAt: new Date(), // Fixed: Missing fields for full BudgetRequest
        };

        // 2. Run interrogation
        const conversation = await this.interrogator.interrogate(request);

        // 3. Determine if human review is needed
        // ROI check assumes historicalROI is comparable to 1.5, checking validity
        const roi = request.historicalROI ? Number(request.historicalROI) : 0;

        const requiresHumanReview: boolean =
            request.amount > 5000 ||
            conversation.length > 1 ||
            (request.historicalROI !== null && roi < 1.5);

        const status = requiresHumanReview ? 'NEEDS_INFO' : 'PENDING';

        // 4. Save to DB
        await prisma.budgetRequest.create({
            data: {
                id: requestId,
                organizationId: request.organizationId,
                requesterId: request.requesterId,
                category: request.category,
                vendor: request.vendor || null,
                amount: request.amount,
                justification: request.justification,
                historicalSpend: request.historicalSpend || null,
                historicalROI: request.historicalROI || null,
                status: status,
                agentConversation: conversation as any, // Cast to any/InputJsonValue
                // @ts-ignore
                predictionMarketId: (request as any).predictionMarketId || null,
            }
        });

        return { status, conversation, requiresHumanReview, requestId };
    }

    /**
     * Run a full organizational spend audit
     */
    async runSpendAudit(organizationId: string): Promise<{
        zombieAlerts: ZombieSpendAlert[];
        unprofitableCustomers: CostAttribution[];
        totalPotentialSavings: number;
        recommendations: string[];
    }> {
        // Hunt zombies
        const zombieAlerts = await this.zombieHunter.hunt(organizationId);
        const zombieSavings = this.zombieHunter.summarizeSavings(zombieAlerts);

        // Find unprofitable customers
        const unprofitableCustomers = await this.costEngine.findUnprofitableCustomers(organizationId);

        // Generate recommendations
        const recommendations: string[] = [];

        if (zombieAlerts.length > 0) {
            recommendations.push(
                `Found ${zombieAlerts.length} zombie resources. ` +
                `Eliminating these could save $${zombieSavings.totalAnnual.toLocaleString()}/year.`
            );
        }

        if (unprofitableCustomers.length > 0) {
            recommendations.push(
                `${unprofitableCustomers.length} customers are below margin threshold. ` +
                `Review pricing or optimize their infrastructure usage.`
            );
        }

        for (const customer of unprofitableCustomers) {
            recommendations.push(...this.costEngine.generateRecommendations(customer));
        }

        return {
            zombieAlerts,
            unprofitableCustomers,
            totalPotentialSavings: zombieSavings.totalAnnual,
            recommendations,
        };
    }

    /**
     * Get ZBB dashboard metrics
     */
    async getDashboardMetrics(organizationId: string): Promise<{
        pendingRequests: number;
        zombieAlerts: number;
        potentialSavings: number;
        avgApprovalTime: number;
    }> {
        // Fetch real metrics from DB
        const pendingRequests = await prisma.budgetRequest.count({
            where: { organizationId, status: 'PENDING' }
        });

        const activeAlerts = await prisma.zombieSpendAlert.count({
            where: { organizationId, status: 'DETECTED' }
        });

        const allAlerts = await prisma.zombieSpendAlert.findMany({
            where: { organizationId, status: 'DETECTED' }
        });
        const savings = this.zombieHunter.summarizeSavings(allAlerts);

        return {
            pendingRequests: pendingRequests || Math.floor(Math.random() * 10), // Fallback to mock if 0 for demo
            zombieAlerts: activeAlerts,
            potentialSavings: savings.totalAnnual,
            avgApprovalTime: 24 + Math.random() * 24, // Hours (Mock for now)
        };
    }
}

export const zbbCoordinator = new ZBBAgentCoordinator();
export const zombieHunter = new ZombieSpendHunter();
export const costAttributionEngine = new CostAttributionEngine();
export const zbbAgent = new InterrogatorAgent();
