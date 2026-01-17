import { zbbAgent } from '../../finance/services/zbb-agents.service';

/**
 * UNIT ECONOMICS SERVICE (The CFO Bot)
 * Enforces the "Financial Physics" of the enterprise.
 * 
 * "We do not scale losses." - The Handbook
 */

// Benchmarks from Handbook
export const MIN_LTV_CAC_RATIO = 3.0;
export const MAX_PAYBACK_MONTHS = 12;

export interface UnitEconomicsData {
    marketingSpend: number;
    newCustomers: number;
    newMRR: number;
    grossMargin: number; // e.g., 0.80 for SaaS
    predictedChurnRate: number; // Forward-looking churn from DTO
}

export class UnitEconomicsService {
    private growthHalted = false;

    async isGrowthHalted(): Promise<boolean> {
        return this.growthHalted;
    }

    // For Testing: Restore state
    async restore(state: { growthHalted: boolean }) {
        this.growthHalted = state.growthHalted;
    }

    async snapshot() {
        return { growthHalted: this.growthHalted };
    }

    /**
     * Check Financial Health and Trigger Circuit Breakers
     */
    async checkFinancialHealth(data: UnitEconomicsData): Promise<{ ltv: number, cac: number, ratio: number, status: string }> {
        // 1. Calculate CAC
        // CAC = Total Sales & Marketing Spend / # New Customers
        if (data.newCustomers === 0) {
            console.warn('[CFO BOT] No new customers. CAC is infinite.');
            return { ltv: 0, cac: 0, ratio: 0, status: 'NO_DATA' };
        }

        const cac = data.marketingSpend / data.newCustomers;

        // 2. Calculate LTV
        // LTV = (Avg Monthly Revenue * Gross Margin) / Churn Rate 
        // CRITICAL: Use PREDICTED churn from DTO, not just historical.
        const avgRevenuePerUser = data.newMRR / data.newCustomers;

        // Protect against zero churn divide by zero (assume 1% floor)
        const safeChurn = Math.max(data.predictedChurnRate, 0.01);

        const ltv = (avgRevenuePerUser * data.grossMargin) / safeChurn;

        // 3. The Golden Ratio
        const ratio = ltv / cac;

        console.log(`[FINANCE PHYSICIST] LTV: $${ltv.toFixed(0)} | CAC: $${cac.toFixed(0)} | Ratio: ${ratio.toFixed(2)}`);

        // 4. The Circuit Breaker logic
        if (ratio < MIN_LTV_CAC_RATIO) {
            console.warn(`🚨 CRITICAL: LTV:CAC Ratio (${ratio.toFixed(2)}) is below 3.0! Burning capital.`);

            this.growthHalted = true; // Set internal state

            // ACTION: Trigger ZBB Agent to freeze marketing cards
            await zbbAgent.triggerGrowthHalt(
                `Unit Economics degradation. Ratio ${ratio.toFixed(2)} < 3.0.`,
                'HIGH'
            );
            return { ltv, cac, ratio, status: 'GROWTH_HALT' };
        } else if (ratio > 5.0) {
            console.info(`🚀 OPPORTUNITY: LTV:CAC is ${ratio.toFixed(2)}. You are underspending on growth.`);
            this.growthHalted = false;
            return { ltv, cac, ratio, status: 'INVEST' };
        }

        // Recovery path: if previously halted but now healthy
        if (this.growthHalted && ratio >= 3.5) { // Needs buffer to recover
            this.growthHalted = false;
            console.log("[CFO BOT] Financial Health Restored. Lifting Growth Halt.");
        }

        return { ltv, cac, ratio, status: 'HEALTHY' };
    }
}

export const unitEconomicsService = new UnitEconomicsService();
