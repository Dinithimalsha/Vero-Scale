/**
 * Unit Economics Service - SaaS Financial Intelligence
 * Calculates CAC, LTV, Rule of 40, and health metrics
 * 
 * CEO Review: CAC Attribution with Time-to-Value allocation
 */

import { prisma } from '../../../config/database';
import { DailyUnitEconomics } from '@prisma/client';
import { errors } from '../../../shared/middleware/error-handler';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface UnitEconomicsInput {
    organizationId: string;
    date: Date;

    // Revenue & Customers
    revenue: number;
    activeCustomers: number;
    newCustomers: number;
    churnedCustomers: number;

    // Expenses
    salesMarketingExpense: number;
    cogsTotal: number; // Cost of Goods Sold

    // Cash
    cashBalance: number;
    monthlyBurnRate: number;
}

export interface HealthGauge {
    ltvCacRatio: number;
    status: 'GREEN' | 'YELLOW' | 'RED';
    message: string;
    recommendation?: string;
}

export interface JCurveData {
    month: number;
    cashFlow: number;
    cumulativeCashFlow: number;
    cacPaybackProgress: number;
    isPaybackMonth: boolean;
}

export interface RuleOf40Analysis {
    score: number;
    growthRate: number;
    profitMargin: number;
    status: 'HEALTHY' | 'NEEDS_ATTENTION' | 'CRITICAL';
    recommendation: string;
}

// ═══════════════════════════════════════════════════════════════════
// UNIT ECONOMICS SERVICE
// ═══════════════════════════════════════════════════════════════════

export class UnitEconomicsService {
    /**
     * Calculate and store daily unit economics snapshot
     */
    async calculateAndStore(input: UnitEconomicsInput): Promise<DailyUnitEconomics> {
        // ARPA (Average Revenue Per Account)
        const arpa = input.activeCustomers > 0
            ? input.revenue / input.activeCustomers
            : 0;

        // Gross Margin % = (Revenue - COGS) / Revenue
        const grossMarginPercent = input.revenue > 0
            ? (input.revenue - input.cogsTotal) / input.revenue
            : 0;

        // Churn Rate = Churned / (Active at start + New)
        const startingCustomers = input.activeCustomers - input.newCustomers + input.churnedCustomers;
        const churnRate = startingCustomers > 0
            ? input.churnedCustomers / startingCustomers
            : 0;

        // CAC = Sales & Marketing / New Customers
        const cacValue = input.newCustomers > 0
            ? input.salesMarketingExpense / input.newCustomers
            : 0;

        // LTV = (ARPA * Gross Margin) / Churn Rate
        const ltvValue = churnRate > 0
            ? (arpa * grossMarginPercent) / churnRate
            : arpa * grossMarginPercent * 36; // Assume 3 year if no churn

        // LTV:CAC Ratio
        const ltvCacRatio = cacValue > 0 ? ltvValue / cacValue : 0;

        // CAC Payback Period (months)
        const monthlyGrossMarginPerCustomer = arpa * grossMarginPercent;
        const cacPaybackMonths = monthlyGrossMarginPerCustomer > 0
            ? cacValue / monthlyGrossMarginPerCustomer
            : 0;

        // Runway (months)
        const runwayMonths = input.monthlyBurnRate > 0
            ? input.cashBalance / input.monthlyBurnRate
            : 999;

        // Rule of 40 components (placeholder - needs historical data)
        const growthRatePercent = 0; // Would need previous month
        const profitMarginPercent = grossMarginPercent * 100;
        const ruleOf40Score = growthRatePercent + profitMarginPercent;

        return prisma.dailyUnitEconomics.upsert({
            where: {
                organizationId_date: {
                    organizationId: input.organizationId,
                    date: input.date,
                },
            },
            update: {
                salesMarketingExpense: input.salesMarketingExpense,
                newCustomersAcquired: input.newCustomers,
                cacValue,
                arpa,
                grossMarginPercent,
                churnRate,
                ltvValue,
                ltvCacRatio,
                cacPaybackMonths,
                cashBalance: input.cashBalance,
                burnRate: input.monthlyBurnRate,
                runwayMonths,
                growthRatePercent,
                profitMarginPercent,
                ruleOf40Score,
            },
            create: {
                organizationId: input.organizationId,
                date: input.date,
                salesMarketingExpense: input.salesMarketingExpense,
                newCustomersAcquired: input.newCustomers,
                cacValue,
                arpa,
                grossMarginPercent,
                churnRate,
                ltvValue,
                ltvCacRatio,
                cacPaybackMonths,
                cashBalance: input.cashBalance,
                burnRate: input.monthlyBurnRate,
                runwayMonths,
                growthRatePercent,
                profitMarginPercent,
                ruleOf40Score,
            },
        });
    }

    /**
     * Get LTV:CAC health gauge
     */
    async getHealthGauge(organizationId: string): Promise<HealthGauge> {
        const latest = await this.getLatestSnapshot(organizationId);

        if (!latest) {
            return {
                ltvCacRatio: 0,
                status: 'YELLOW',
                message: 'No data available',
                recommendation: 'Connect financial data sources to begin tracking',
            };
        }

        const ratio = Number(latest.ltvCacRatio);

        if (ratio >= 3) {
            return {
                ltvCacRatio: ratio,
                status: 'GREEN',
                message: 'Healthy unit economics',
                recommendation: 'Consider increasing marketing spend to accelerate growth',
            };
        }

        if (ratio >= 1) {
            return {
                ltvCacRatio: ratio,
                status: 'YELLOW',
                message: 'Unit economics need optimization',
                recommendation: ratio < 2
                    ? 'Focus on reducing CAC or increasing retention'
                    : 'Approaching sustainable levels, continue optimizing',
            };
        }

        return {
            ltvCacRatio: ratio,
            status: 'RED',
            message: 'Unsustainable: Burning capital to tread water',
            recommendation: 'CRITICAL: Reduce CAC immediately or increase prices',
        };
    }

    /**
     * Check for insolvency risk (CAC Payback > Runway)
     */
    async checkInsolvencyRisk(organizationId: string): Promise<{
        atRisk: boolean;
        cacPaybackMonths: number;
        runwayMonths: number;
        message?: string;
    }> {
        const latest = await this.getLatestSnapshot(organizationId);

        if (!latest) {
            return { atRisk: false, cacPaybackMonths: 0, runwayMonths: 0 };
        }

        const cacPayback = Number(latest.cacPaybackMonths);
        const runway = Number(latest.runwayMonths);

        if (cacPayback > runway) {
            return {
                atRisk: true,
                cacPaybackMonths: cacPayback,
                runwayMonths: runway,
                message: `INSOLVENCY RISK: CAC payback (${cacPayback.toFixed(1)} months) exceeds runway (${runway.toFixed(1)} months)`,
            };
        }

        return {
            atRisk: false,
            cacPaybackMonths: cacPayback,
            runwayMonths: runway,
        };
    }

    /**
     * Generate J-Curve visualization data
     */
    async getJCurveData(
        organizationId: string,
        months: number = 24
    ): Promise<JCurveData[]> {
        const latest = await this.getLatestSnapshot(organizationId);

        if (!latest) {
            return [];
        }

        const cac = Number(latest.cacValue);
        const monthlyGrossProfit = Number(latest.arpa) * Number(latest.grossMarginPercent);
        const paybackMonths = Math.ceil(Number(latest.cacPaybackMonths));

        const curve: JCurveData[] = [];
        let cumulativeCashFlow = -cac; // Start negative (acquisition cost)

        for (let month = 0; month <= months; month++) {
            const monthlyFlow = month === 0 ? -cac : monthlyGrossProfit;
            cumulativeCashFlow = month === 0 ? -cac : cumulativeCashFlow + monthlyGrossProfit;

            curve.push({
                month,
                cashFlow: monthlyFlow,
                cumulativeCashFlow,
                cacPaybackProgress: Math.min(100, (month / paybackMonths) * 100),
                isPaybackMonth: month === paybackMonths,
            });
        }

        return curve;
    }

    /**
     * Analyze Rule of 40 with recommendations
     */
    async analyzeRuleOf40(organizationId: string): Promise<RuleOf40Analysis> {
        // Get last 2 months for growth calculation
        const snapshots = await prisma.dailyUnitEconomics.findMany({
            where: { organizationId },
            orderBy: { date: 'desc' },
            take: 2,
        });

        if (snapshots.length < 2) {
            return {
                score: 0,
                growthRate: 0,
                profitMargin: 0,
                status: 'NEEDS_ATTENTION',
                recommendation: 'Insufficient data - need at least 2 months of snapshots',
            };
        }

        const [current, previous] = snapshots;

        // MoM Growth annualized
        const momGrowth = Number(previous!.arpa) > 0
            ? ((Number(current!.arpa) - Number(previous!.arpa)) / Number(previous!.arpa)) * 12 * 100
            : 0;

        const profitMargin = Number(current!.profitMarginPercent);
        const score = momGrowth + profitMargin;

        if (score >= 40) {
            return {
                score,
                growthRate: momGrowth,
                profitMargin,
                status: 'HEALTHY',
                recommendation: 'Excellent balance of growth and profitability',
            };
        }

        if (score >= 20) {
            return {
                score,
                growthRate: momGrowth,
                profitMargin,
                status: 'NEEDS_ATTENTION',
                recommendation: momGrowth < profitMargin
                    ? 'Consider increasing marketing to boost growth'
                    : 'Focus on operational efficiency to improve margins',
            };
        }

        return {
            score,
            growthRate: momGrowth,
            profitMargin,
            status: 'CRITICAL',
            recommendation: 'URGENT: Both growth and profitability need improvement',
        };
    }

    /**
     * Get historical trend data
     */
    async getHistoricalTrend(
        organizationId: string,
        days: number = 30
    ): Promise<DailyUnitEconomics[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return prisma.dailyUnitEconomics.findMany({
            where: {
                organizationId,
                date: { gte: startDate },
            },
            orderBy: { date: 'asc' },
        });
    }

    /**
     * Get latest snapshot
     */
    async getLatestSnapshot(organizationId: string): Promise<DailyUnitEconomics | null> {
        return prisma.dailyUnitEconomics.findFirst({
            where: { organizationId },
            orderBy: { date: 'desc' },
        });
    }
}

export const unitEconomicsService = new UnitEconomicsService();
