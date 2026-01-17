import { prisma } from '../../../shared/prisma';
import { mudaService } from '../../operations/services/muda.service';
import { zombieHunter } from '../../finance/services/zbb-agents.service';

// ═══════════════════════════════════════════════════════════════════
// NORTH STAR METRIC SERVICE
// Aggregates Financial, Operational, and Compliance health
// ═══════════════════════════════════════════════════════════════════

export interface NorthStarMetric {
    healthScore: number; // 0-100
    trend: 'UP' | 'DOWN' | 'STABLE';
    components: {
        financialHealth: number;  // Based on Zombie Spend / Budget
        operationalFlow: number;  // Based on Muda Waste Score
        complianceScore: number;  // Based on Policy Violations
    };
    insights: string[];
}

export class AnalyticsService {

    /**
     * Calculate the "Pulse" of the organization
     */
    async getNorthStarMetric(organizationId: string): Promise<NorthStarMetric> {
        // 1. Financial Health
        // Lower zombie spend = Higher Health
        // Define Threshold: > $50k/month waste = 0 score. $0 waste = 100 score.
        const zombieStats = await (await zombieHunter.hunt(organizationId)).reduce((acc, z) => acc + z.potentialSavings, 0);
        const financialScore = Math.max(0, 100 - (zombieStats / 500)); // Rough heuristic: $1 waste = -0.2 points? No, $500 waste = -1 point. $50k = -100.

        // 2. Operational Flow (Muda)
        // Muda Service returns a "wasteScore" (lower is better). We invert it.
        const mudaOverview = await mudaService.getMudaOverview(organizationId);
        const operationalScore = Math.max(0, 100 - mudaOverview.totalWasteScore);

        // 3. Compliance Score
        // Ratio of ALLOW vs DENY/WARN in last 7 days
        const recentAudits = await prisma.complianceAuditLog.findMany({
            where: {
                organizationId,
                timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            },
            select: { decision: true }
        });

        let complianceScore = 100;
        if (recentAudits.length > 0) {
            const failures = recentAudits.filter(a => a.decision === 'DENY').length;
            const warnings = recentAudits.filter(a => a.decision === 'WARN').length;
            // 5 points deduction for Deny, 1 for Warn
            const penalties = (failures * 5) + (warnings * 1);
            // Normalize by volume? Or absolute penalty?
            // "Compliance Score" usually implies percentage of passing checks.
            const totalChecks = recentAudits.length;
            const passing = totalChecks - failures; // Warnings are passing but noisy
            complianceScore = (passing / totalChecks) * 100;
        }

        // Weighted Average
        // Financial: 40%, Ops: 30%, Compliance: 30%
        const healthScore = Math.round(
            (financialScore * 0.4) + (operationalScore * 0.3) + (complianceScore * 0.3)
        );

        // Insights
        const insights: string[] = [];
        if (financialScore < 70) insights.push('High Zombie Spend detected. Run ZBB audit.');
        if (operationalScore < 70) insights.push('Operational waste is high. Check Muda dashboard.');
        if (complianceScore < 80) insights.push(`Compliance rate is ${(complianceScore).toFixed(0)}%. Investigate policy failures.`);
        if (healthScore > 90) insights.push('Organization is operating at peak efficiency.');

        return {
            healthScore,
            trend: 'STABLE', // Todo: Compare with historical snapshot
            components: {
                financialHealth: Math.round(financialScore),
                operationalFlow: Math.round(operationalScore),
                complianceScore: Math.round(complianceScore)
            },
            insights
        };
    }
}

export const analyticsService = new AnalyticsService();
