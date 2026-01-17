/**
 * ETL Pipeline Service - Data Integration & Analytics
 * Extract from integrations, Transform to normalized format, Load to analytics schema
 */

import { prisma } from '../../../config/database';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface ExtractConfig {
    source: 'github' | 'plaid' | 'slack' | 'internal';
    endpoint?: string;
    credentials?: Record<string, string>;
    filters?: Record<string, unknown>;
}

export interface TransformRule {
    sourceField: string;
    targetField: string;
    transformation: 'direct' | 'sum' | 'avg' | 'count' | 'custom';
    customFn?: (value: unknown) => unknown;
}

export interface LoadTarget {
    table: string;
    upsertKey: string[];
    fields: string[];
}

export interface PipelineConfig {
    name: string;
    schedule: 'hourly' | 'daily' | 'weekly';
    extract: ExtractConfig;
    transform: TransformRule[];
    load: LoadTarget;
}

export interface PipelineRun {
    pipelineId: string;
    startTime: Date;
    endTime?: Date;
    status: 'running' | 'completed' | 'failed';
    recordsExtracted: number;
    recordsLoaded: number;
    errors: string[];
}

export interface AnalyticsSnapshot {
    organizationId: string;
    date: Date;
    // Operations Metrics
    velocityTrend: number;
    andonEventsCount: number;
    mttrMinutes: number;
    wasteScore: number;
    // Finance Metrics
    revenue: number;
    mrr: number;
    cac: number;
    ltv: number;
    ltvCacRatio: number;
    runwayMonths: number;
    // Team Metrics
    teamSize: number;
    openRoles: number;
    feedbackCount: number;
}

// ═══════════════════════════════════════════════════════════════════
// ETL SERVICE
// ═══════════════════════════════════════════════════════════════════

export class EtlService {
    /**
     * Extract data from internal sources
     */
    async extractInternal(organizationId: string, source: string): Promise<unknown[]> {
        switch (source) {
            case 'operations':
                return this.extractOperationsData(organizationId);
            case 'finance':
                return this.extractFinanceData(organizationId);
            case 'legal':
                return this.extractLegalData(organizationId);
            case 'humanCapital':
                return this.extractHumanCapitalData(organizationId);
            default:
                throw new Error(`Unknown source: ${source}`);
        }
    }

    /**
     * Extract operations metrics
     */
    private async extractOperationsData(organizationId: string): Promise<unknown[]> {
        const [pitches, andonEvents, tasks] = await Promise.all([
            prisma.productionPitch.findMany({
                where: { organizationId, status: 'COMPLETED' },
                orderBy: { endTime: 'desc' },
                take: 30,
                include: { tasks: { where: { status: 'DONE' } } },
            }),
            prisma.andonEvent.findMany({
                where: { organizationId },
                orderBy: { createdAt: 'desc' },
                take: 100,
            }),
            prisma.task.findMany({
                where: { organizationId },
                select: { status: true, taskType: true, storyPoints: true, totalIdleMinutes: true },
            }),
        ]);

        return [{ pitches, andonEvents, tasks }];
    }

    /**
     * Extract finance metrics
     */
    private async extractFinanceData(organizationId: string): Promise<unknown[]> {
        const [economics, transactions] = await Promise.all([
            prisma.dailyUnitEconomics.findMany({
                where: { organizationId },
                orderBy: { date: 'desc' },
                take: 90,
            }),
            prisma.transaction.findMany({
                where: { organizationId },
                orderBy: { date: 'desc' },
                take: 1000,
            }),
        ]);

        return [{ economics, transactions }];
    }

    /**
     * Extract legal metrics
     */
    private async extractLegalData(organizationId: string): Promise<unknown[]> {
        const [agreements, grants] = await Promise.all([
            prisma.ipAgreement.findMany({ where: { organizationId } }),
            prisma.vestingGrant.findMany({ where: { organizationId } }),
        ]);

        return [{ agreements, grants }];
    }

    /**
     * Extract human capital metrics
     */
    private async extractHumanCapitalData(organizationId: string): Promise<unknown[]> {
        const [users, feedback, scorecards] = await Promise.all([
            prisma.user.count({ where: { organizationId } }),
            prisma.feedbackEntry.findMany({
                where: { organizationId },
                orderBy: { createdAt: 'desc' },
                take: 100,
            }),
            prisma.jobScorecard.findMany({ where: { organizationId } }),
        ]);

        return [{ userCount: users, feedback, scorecards }];
    }

    /**
     * Transform data to normalized analytics format
     */
    transformToAnalytics(
        organizationId: string,
        operationsData: Record<string, unknown>,
        financeData: Record<string, unknown>,
        humanCapitalData: Record<string, unknown>
    ): AnalyticsSnapshot {
        const pitches = (operationsData.pitches || []) as Array<{ tasks: Array<{ storyPoints: number }> }>;
        const andonEvents = (operationsData.andonEvents || []) as Array<{ mttrMinutes?: number; status: string }>;
        const tasks = (operationsData.tasks || []) as Array<{ totalIdleMinutes?: number }>;

        const economics = (financeData.economics || []) as Array<Record<string, unknown>>;
        const latestEcon = economics[0] || {};

        const userCount = (humanCapitalData.userCount || 0) as number;
        const feedback = (humanCapitalData.feedback || []) as unknown[];
        const scorecards = (humanCapitalData.scorecards || []) as unknown[];

        // Calculate velocity trend
        const velocities = pitches.slice(0, 5).map(p =>
            p.tasks?.reduce((s, t) => s + t.storyPoints, 0) || 0
        );
        const velocityTrend = velocities.length > 0
            ? velocities.reduce((a, b) => a + b, 0) / velocities.length
            : 0;

        // Calculate MTTR
        const resolvedAndon = andonEvents.filter(e => e.mttrMinutes && e.status === 'RESOLVED');
        const mttrMinutes = resolvedAndon.length > 0
            ? resolvedAndon.reduce((s, e) => s + (e.mttrMinutes || 0), 0) / resolvedAndon.length
            : 0;

        // Calculate waste score
        const totalIdleMinutes = tasks.reduce((s, t) => s + (t.totalIdleMinutes || 0), 0);
        const wasteScore = Math.min(100, Math.round(totalIdleMinutes / 60 / tasks.length * 10) || 0);

        return {
            organizationId,
            date: new Date(),
            velocityTrend: Math.round(velocityTrend * 10) / 10,
            andonEventsCount: andonEvents.filter(e => e.status === 'ACTIVE').length,
            mttrMinutes: Math.round(mttrMinutes),
            wasteScore,
            revenue: Number(latestEcon.arpa || 0) * userCount,
            mrr: Number(latestEcon.arpa || 0) * userCount,
            cac: Number(latestEcon.cacValue || 0),
            ltv: Number(latestEcon.ltvValue || 0),
            ltvCacRatio: Number(latestEcon.ltvCacRatio || 0),
            runwayMonths: Number(latestEcon.runwayMonths || 0),
            teamSize: userCount,
            openRoles: scorecards.length,
            feedbackCount: feedback.length,
        };
    }

    /**
     * Load analytics snapshot to database
     */
    async loadAnalyticsSnapshot(snapshot: AnalyticsSnapshot): Promise<void> {
        await prisma.analyticsSnapshot.upsert({
            where: {
                organizationId_date: {
                    organizationId: snapshot.organizationId,
                    date: snapshot.date,
                },
            },
            update: snapshot,
            create: snapshot,
        });
    }

    /**
     * Run full ETL pipeline for organization
     */
    async runPipeline(organizationId: string): Promise<PipelineRun> {
        const startTime = new Date();
        const errors: string[] = [];
        let recordsExtracted = 0;

        try {
            // Extract
            const [ops, fin, hc] = await Promise.all([
                this.extractInternal(organizationId, 'operations'),
                this.extractInternal(organizationId, 'finance'),
                this.extractInternal(organizationId, 'humanCapital'),
            ]);
            recordsExtracted = 3;

            // Transform
            const snapshot = this.transformToAnalytics(
                organizationId,
                ops[0] as Record<string, unknown>,
                fin[0] as Record<string, unknown>,
                hc[0] as Record<string, unknown>
            );

            // Load
            await this.loadAnalyticsSnapshot(snapshot);

            return {
                pipelineId: `etl-${organizationId}`,
                startTime,
                endTime: new Date(),
                status: 'completed',
                recordsExtracted,
                recordsLoaded: 1,
                errors,
            };
        } catch (error) {
            errors.push(String(error));
            return {
                pipelineId: `etl-${organizationId}`,
                startTime,
                endTime: new Date(),
                status: 'failed',
                recordsExtracted,
                recordsLoaded: 0,
                errors,
            };
        }
    }
}

export const etlService = new EtlService();
