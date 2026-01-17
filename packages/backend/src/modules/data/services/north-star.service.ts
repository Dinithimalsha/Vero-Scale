/**
 * North Star Dashboard Service - Leading Indicator Analysis
 * Metric configuration, correlation analysis, and regression insights
 */

import { prisma } from '../../../config/database';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface MetricConfig {
    id: string;
    name: string;
    description: string;
    category: 'operations' | 'finance' | 'team' | 'customer';
    dataSource: string;
    aggregation: 'sum' | 'avg' | 'count' | 'last';
    unit: string;
    isNorthStar: boolean;
    targetValue?: number;
    warningThreshold?: number;
    criticalThreshold?: number;
}

export interface MetricValue {
    metricId: string;
    date: Date;
    value: number;
    previousValue?: number;
    changePercent?: number;
}

export interface CorrelationResult {
    metric1: string;
    metric2: string;
    coefficient: number;
    strength: 'weak' | 'moderate' | 'strong';
    direction: 'positive' | 'negative';
    lagDays: number;
    interpretation: string;
}

export interface RegressionResult {
    targetMetric: string;
    predictors: Array<{
        metric: string;
        coefficient: number;
        pValue: number;
        isSignificant: boolean;
    }>;
    rSquared: number;
    interpretation: string;
    prediction: {
        nextPeriodValue: number;
        confidenceInterval: [number, number];
    };
}

export interface DashboardData {
    northStarMetric: MetricValue;
    leadingIndicators: MetricValue[];
    laggingIndicators: MetricValue[];
    correlations: CorrelationResult[];
    alerts: Array<{
        metricId: string;
        level: 'warning' | 'critical';
        message: string;
    }>;
}

// ═══════════════════════════════════════════════════════════════════
// DEFAULT METRICS
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_METRICS: MetricConfig[] = [
    // North Star
    { id: 'mrr', name: 'Monthly Recurring Revenue', description: 'Total MRR across all customers', category: 'finance', dataSource: 'unit_economics.arpa * customers', aggregation: 'last', unit: 'USD', isNorthStar: true },

    // Leading Indicators
    { id: 'velocity', name: 'Team Velocity', description: 'Story points completed per pitch', category: 'operations', dataSource: 'production_pitches', aggregation: 'avg', unit: 'points', isNorthStar: false },
    { id: 'ltv_cac', name: 'LTV:CAC Ratio', description: 'Customer lifetime value to acquisition cost', category: 'finance', dataSource: 'unit_economics', aggregation: 'last', unit: 'ratio', isNorthStar: false, warningThreshold: 2, criticalThreshold: 1 },
    { id: 'nps', name: 'Net Promoter Score', description: 'Customer satisfaction metric', category: 'customer', dataSource: 'surveys', aggregation: 'avg', unit: 'score', isNorthStar: false, warningThreshold: 30, criticalThreshold: 0 },
    { id: 'runway', name: 'Runway Months', description: 'Months of cash remaining', category: 'finance', dataSource: 'unit_economics', aggregation: 'last', unit: 'months', isNorthStar: false, warningThreshold: 12, criticalThreshold: 6 },

    // Lagging Indicators
    { id: 'churn', name: 'Churn Rate', description: 'Monthly customer churn', category: 'customer', dataSource: 'unit_economics', aggregation: 'last', unit: '%', isNorthStar: false },
    { id: 'mttr', name: 'Mean Time to Resolve', description: 'Average incident resolution time', category: 'operations', dataSource: 'andon_events', aggregation: 'avg', unit: 'minutes', isNorthStar: false },
    { id: 'waste_score', name: 'Waste Score', description: 'Muda detection score', category: 'operations', dataSource: 'tasks', aggregation: 'last', unit: 'score', isNorthStar: false },
];

// ═══════════════════════════════════════════════════════════════════
// NORTH STAR SERVICE
// ═══════════════════════════════════════════════════════════════════

export class NorthStarService {
    private metricsCache: Map<string, MetricConfig> = new Map();

    constructor() {
        // Initialize with default metrics
        DEFAULT_METRICS.forEach(m => this.metricsCache.set(m.id, m));
    }

    /**
     * Get all configured metrics
     */
    getMetrics(): MetricConfig[] {
        return Array.from(this.metricsCache.values());
    }

    /**
     * Configure a custom metric
     */
    configureMetric(config: MetricConfig): void {
        this.metricsCache.set(config.id, config);
    }

    /**
     * Get current metric values for org
     */
    async getMetricValues(organizationId: string): Promise<MetricValue[]> {
        // Get latest analytics snapshot
        const snapshot = await prisma.analyticsSnapshot.findFirst({
            where: { organizationId },
            orderBy: { date: 'desc' },
        });

        // Get previous snapshot for comparison
        const previousSnapshot = await prisma.analyticsSnapshot.findFirst({
            where: { organizationId },
            orderBy: { date: 'desc' },
            skip: 1,
        });

        if (!snapshot) {
            return [];
        }

        const values: MetricValue[] = [];
        const snapshotData = snapshot as unknown as Record<string, number | undefined>;
        const prevData = previousSnapshot as unknown as Record<string, number | undefined> | null;

        const metricMapping: Record<string, string> = {
            mrr: 'mrr',
            velocity: 'velocityTrend',
            ltv_cac: 'ltvCacRatio',
            runway: 'runwayMonths',
            mttr: 'mttrMinutes',
            waste_score: 'wasteScore',
            churn: 'churnRate',
        };

        for (const [metricId, snapshotField] of Object.entries(metricMapping)) {
            const value = snapshotData[snapshotField];
            const previousValue = prevData?.[snapshotField];

            if (value !== undefined) {
                const changePercent = previousValue && previousValue !== 0
                    ? ((value - previousValue) / previousValue) * 100
                    : undefined;

                values.push({
                    metricId,
                    date: snapshot.date,
                    value: Number(value),
                    previousValue: previousValue ? Number(previousValue) : undefined,
                    changePercent: changePercent ? Math.round(changePercent * 10) / 10 : undefined,
                });
            }
        }

        return values;
    }

    /**
     * Calculate correlation between two metrics
     */
    calculateCorrelation(
        series1: number[],
        series2: number[],
        lagDays: number = 0
    ): number {
        if (series1.length < 3 || series2.length < 3) {
            return 0;
        }

        // Apply lag to series2
        const s1 = lagDays > 0 ? series1.slice(lagDays) : series1;
        const s2 = lagDays > 0 ? series2.slice(0, -lagDays) : series2;

        const n = Math.min(s1.length, s2.length);
        if (n < 3) return 0;

        const mean1 = s1.slice(0, n).reduce((a, b) => a + b, 0) / n;
        const mean2 = s2.slice(0, n).reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let denom1 = 0;
        let denom2 = 0;

        for (let i = 0; i < n; i++) {
            const diff1 = s1[i] - mean1;
            const diff2 = s2[i] - mean2;
            numerator += diff1 * diff2;
            denom1 += diff1 * diff1;
            denom2 += diff2 * diff2;
        }

        const denominator = Math.sqrt(denom1 * denom2);
        return denominator === 0 ? 0 : numerator / denominator;
    }

    /**
     * Analyze correlations between leading indicators and north star
     */
    async analyzeCorrelations(organizationId: string): Promise<CorrelationResult[]> {
        // Get historical snapshots
        const snapshots = await prisma.analyticsSnapshot.findMany({
            where: { organizationId },
            orderBy: { date: 'asc' },
            take: 90,
        });

        if (snapshots.length < 7) {
            return [];
        }

        const results: CorrelationResult[] = [];
        const northStarField = 'mrr';

        const leadingFields = ['velocityTrend', 'ltvCacRatio', 'runwayMonths'];

        for (const field of leadingFields) {
            const series1 = snapshots.map(s => Number((s as unknown as Record<string, number>)[northStarField] || 0));
            const series2 = snapshots.map(s => Number((s as unknown as Record<string, number>)[field] || 0));

            // Try different lag periods
            for (const lagDays of [0, 7, 14, 30]) {
                const coefficient = this.calculateCorrelation(series1, series2, lagDays);
                const absCoef = Math.abs(coefficient);

                if (absCoef > 0.3) { // Only include meaningful correlations
                    results.push({
                        metric1: northStarField,
                        metric2: field,
                        coefficient: Math.round(coefficient * 100) / 100,
                        strength: absCoef > 0.7 ? 'strong' : absCoef > 0.5 ? 'moderate' : 'weak',
                        direction: coefficient > 0 ? 'positive' : 'negative',
                        lagDays,
                        interpretation: this.interpretCorrelation(field, coefficient, lagDays),
                    });
                    break; // Best lag found
                }
            }
        }

        return results;
    }

    /**
     * Simple linear regression for prediction
     */
    async predictMetric(
        organizationId: string,
        targetMetric: string,
        predictorMetrics: string[]
    ): Promise<RegressionResult> {
        const snapshots = await prisma.analyticsSnapshot.findMany({
            where: { organizationId },
            orderBy: { date: 'asc' },
            take: 60,
        });

        if (snapshots.length < 10) {
            throw new Error('Insufficient data for regression (need at least 10 points)');
        }

        // Simple linear regression using first predictor
        const target = snapshots.map(s => Number((s as unknown as Record<string, number>)[targetMetric] || 0));
        const predictors = predictorMetrics.map(p => ({
            metric: p,
            values: snapshots.map(s => Number((s as unknown as Record<string, number>)[p] || 0)),
        }));

        // Calculate coefficients (simplified single-predictor regression)
        const mainPredictor = predictors[0];
        const n = target.length;
        const sumX = mainPredictor.values.reduce((a, b) => a + b, 0);
        const sumY = target.reduce((a, b) => a + b, 0);
        const sumXY = mainPredictor.values.reduce((sum, x, i) => sum + x * target[i], 0);
        const sumXX = mainPredictor.values.reduce((sum, x) => sum + x * x, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Calculate R-squared
        const meanY = sumY / n;
        const ssTotal = target.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
        const ssResidual = target.reduce((sum, y, i) => {
            const predicted = intercept + slope * mainPredictor.values[i];
            return sum + Math.pow(y - predicted, 2);
        }, 0);
        const rSquared = 1 - ssResidual / ssTotal;

        // Predict next period
        const lastX = mainPredictor.values[mainPredictor.values.length - 1];
        const avgChange = (lastX - mainPredictor.values[0]) / mainPredictor.values.length;
        const nextX = lastX + avgChange;
        const prediction = intercept + slope * nextX;

        return {
            targetMetric,
            predictors: [{
                metric: mainPredictor.metric,
                coefficient: Math.round(slope * 1000) / 1000,
                pValue: 0.05, // Simplified
                isSignificant: Math.abs(rSquared) > 0.3,
            }],
            rSquared: Math.round(rSquared * 100) / 100,
            interpretation: `${mainPredictor.metric} explains ${Math.round(rSquared * 100)}% of ${targetMetric} variance`,
            prediction: {
                nextPeriodValue: Math.round(prediction * 100) / 100,
                confidenceInterval: [
                    Math.round((prediction * 0.9) * 100) / 100,
                    Math.round((prediction * 1.1) * 100) / 100,
                ],
            },
        };
    }

    /**
     * Get full dashboard data
     */
    async getDashboardData(organizationId: string): Promise<DashboardData> {
        const [metricValues, correlations] = await Promise.all([
            this.getMetricValues(organizationId),
            this.analyzeCorrelations(organizationId),
        ]);

        const northStar = metricValues.find(m => m.metricId === 'mrr') || {
            metricId: 'mrr',
            date: new Date(),
            value: 0,
        };

        const leadingIndicators = metricValues.filter(m =>
            ['velocity', 'ltv_cac', 'runway'].includes(m.metricId)
        );

        const laggingIndicators = metricValues.filter(m =>
            ['churn', 'mttr', 'waste_score'].includes(m.metricId)
        );

        // Generate alerts
        const alerts: DashboardData['alerts'] = [];
        for (const metric of metricValues) {
            const config = this.metricsCache.get(metric.metricId);
            if (!config) continue;

            if (config.criticalThreshold !== undefined && metric.value < config.criticalThreshold) {
                alerts.push({
                    metricId: metric.metricId,
                    level: 'critical',
                    message: `${config.name} is critically low at ${metric.value}${config.unit}`,
                });
            } else if (config.warningThreshold !== undefined && metric.value < config.warningThreshold) {
                alerts.push({
                    metricId: metric.metricId,
                    level: 'warning',
                    message: `${config.name} is below target at ${metric.value}${config.unit}`,
                });
            }
        }

        return {
            northStarMetric: northStar,
            leadingIndicators,
            laggingIndicators,
            correlations,
            alerts,
        };
    }

    private interpretCorrelation(field: string, coefficient: number, lagDays: number): string {
        const direction = coefficient > 0 ? 'increases' : 'decreases';
        const lag = lagDays > 0 ? ` with a ${lagDays}-day lag` : '';
        return `When ${field} ${direction}, MRR tends to follow${lag}`;
    }
}

export const northStarService = new NorthStarService();
