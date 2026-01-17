/**
 * Andon Service - Jidoka Implementation
 * "Stop the Line" philosophy for software quality
 * 
 * CEO Review Incorporated:
 * - Swarming support (not just alerts)
 * - MTTR tracking
 * - Collaborative resolution workflow
 */

import { prisma } from '../../../config/database';
import {
    AndonEvent,
    AndonStatus,
    AndonSeverity,
    AndonTrigger,
    HealthStatus,
} from '@prisma/client';
import { errors } from '../../../shared/middleware/error-handler';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface AndonTriggerPayload {
    source: AndonTrigger;
    severity?: AndonSeverity;
    commitHash?: string;
    commitAuthor?: string;
    branchName?: string;
    pipelineUrl?: string;
    errorLog?: string;
    coveragePercent?: number;
}

export interface SystemHealthStatus {
    status: HealthStatus;
    activeIncidentCount: number;
    mainBranchLocked: boolean;
    incidents: {
        id: string;
        source: AndonTrigger;
        severity: AndonSeverity;
        status: AndonStatus;
        claimedBy?: string;
        createdAt: Date;
    }[];
}

export interface MTTRMetrics {
    averageMttrMinutes: number;
    medianMttrMinutes: number;
    last30DaysCount: number;
    bySource: { source: AndonTrigger; avgMttr: number; count: number }[];
}

export interface ResolvePayload {
    resolverId: string;
    rootCause: string;
    preventionAction?: string;
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const COVERAGE_THRESHOLD = 85;
const _SWARM_TIMEOUT_MINUTES = 30; // Auto-escalate if not claimed - TODO: implement escalation

// ═══════════════════════════════════════════════════════════════════
// ANDON SERVICE
// ═══════════════════════════════════════════════════════════════════

export class AndonService {
    /**
     * Trigger an Andon event - stops the line
     * Notifies team and locks branch if severity is STOP_LINE
     */
    async triggerAndon(
        organizationId: string,
        payload: AndonTriggerPayload
    ): Promise<AndonEvent> {
        const severity = payload.severity ?? this.determineSeverity(payload);

        // 1. Create Andon event
        const event = await prisma.andonEvent.create({
            data: {
                organizationId,
                triggerSource: payload.source,
                severityLevel: severity,
                commitHash: payload.commitHash,
                commitAuthor: payload.commitAuthor,
                branchName: payload.branchName,
                pipelineUrl: payload.pipelineUrl,
                errorLog: payload.errorLog,
                coveragePercent: payload.coveragePercent,
                status: 'ACTIVE',
            },
        });

        // 2. Update system health
        const newStatus: HealthStatus = severity === 'STOP_LINE' ? 'RED' : 'YELLOW';

        await prisma.systemHealth.upsert({
            where: { organizationId },
            update: {
                status: newStatus,
                lastUpdated: new Date(),
                activeIncidentCount: { increment: 1 },
                mainBranchLocked: severity === 'STOP_LINE',
                lockReason: severity === 'STOP_LINE' ? `Andon: ${payload.source}` : null,
            },
            create: {
                organizationId,
                status: newStatus,
                activeIncidentCount: 1,
                mainBranchLocked: severity === 'STOP_LINE',
                lockReason: severity === 'STOP_LINE' ? `Andon: ${payload.source}` : null,
            },
        });

        // 3. Notify via integrations (Slack, etc.)
        // This will be handled by the integration layer
        // For now, we emit an event that can be consumed
        console.log(`🚨 ANDON TRIGGERED: ${payload.source} - ${severity}`);

        return event;
    }

    /**
     * Claim an incident - starts the swarming process
     * Per CEO: This facilitates collaborative resolution
     */
    async claimIncident(
        eventId: string,
        userId: string,
        swarmChannelId?: string
    ): Promise<AndonEvent> {
        const event = await prisma.andonEvent.findUnique({
            where: { id: eventId },
        });

        if (!event) {
            throw errors.notFound('Andon Event');
        }

        if (event.status !== 'ACTIVE') {
            throw errors.conflict('Event already claimed or resolved');
        }

        return prisma.andonEvent.update({
            where: { id: eventId },
            data: {
                status: swarmChannelId ? 'SWARMING' : 'CLAIMED',
                claimedById: userId,
                claimedAt: new Date(),
                swarmChannelId,
            },
        });
    }

    /**
     * Resolve an Andon event - unlocks the line if no other incidents
     */
    async resolveAndon(
        eventId: string,
        payload: ResolvePayload
    ): Promise<AndonEvent> {
        const event = await prisma.andonEvent.findUnique({
            where: { id: eventId },
        });

        if (!event) {
            throw errors.notFound('Andon Event');
        }

        if (event.status === 'RESOLVED') {
            throw errors.conflict('Event already resolved');
        }

        // Calculate MTTR
        const mttrMinutes = Math.round(
            (Date.now() - event.createdAt.getTime()) / 60000
        );

        // Update event
        const resolved = await prisma.andonEvent.update({
            where: { id: eventId },
            data: {
                status: 'RESOLVED',
                resolvedAt: new Date(),
                resolvedById: payload.resolverId,
                rootCause: payload.rootCause,
                preventionAction: payload.preventionAction,
                mttrMinutes,
            },
        });

        // Check remaining active incidents
        const remainingIncidents = await prisma.andonEvent.count({
            where: {
                organizationId: event.organizationId,
                status: { in: ['ACTIVE', 'CLAIMED', 'SWARMING'] },
            },
        });

        // Update system health
        const newStatus: HealthStatus = remainingIncidents === 0 ? 'GREEN' : 'YELLOW';

        await prisma.systemHealth.update({
            where: { organizationId: event.organizationId },
            data: {
                status: newStatus,
                activeIncidentCount: remainingIncidents,
                mainBranchLocked: remainingIncidents > 0,
                lockReason: remainingIncidents > 0 ? 'Active incidents remaining' : null,
                lastUpdated: new Date(),
            },
        });

        console.log(`✅ ANDON RESOLVED: ${eventId} - MTTR: ${mttrMinutes}m`);

        return resolved;
    }

    /**
     * Get current system health status
     */
    async getSystemHealth(organizationId: string): Promise<SystemHealthStatus> {
        const [health, incidents] = await Promise.all([
            prisma.systemHealth.findUnique({ where: { organizationId } }),
            prisma.andonEvent.findMany({
                where: {
                    organizationId,
                    status: { in: ['ACTIVE', 'CLAIMED', 'SWARMING'] },
                },
                orderBy: { createdAt: 'desc' },
                include: { claimedBy: { select: { name: true } } },
            }),
        ]);

        return {
            status: health?.status ?? 'GREEN',
            activeIncidentCount: health?.activeIncidentCount ?? 0,
            mainBranchLocked: health?.mainBranchLocked ?? false,
            incidents: incidents.map((i) => ({
                id: i.id,
                source: i.triggerSource,
                severity: i.severityLevel,
                status: i.status,
                claimedBy: i.claimedBy?.name,
                createdAt: i.createdAt,
            })),
        };
    }

    /**
     * Calculate MTTR metrics
     */
    async getMTTRMetrics(organizationId: string): Promise<MTTRMetrics> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const resolvedEvents = await prisma.andonEvent.findMany({
            where: {
                organizationId,
                status: 'RESOLVED',
                resolvedAt: { gte: thirtyDaysAgo },
                mttrMinutes: { not: null },
            },
            select: {
                triggerSource: true,
                mttrMinutes: true,
            },
        });

        if (resolvedEvents.length === 0) {
            return {
                averageMttrMinutes: 0,
                medianMttrMinutes: 0,
                last30DaysCount: 0,
                bySource: [],
            };
        }

        const mttrValues = resolvedEvents
            .map((e) => e.mttrMinutes!)
            .sort((a, b) => a - b);

        const average = mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length;
        const median =
            mttrValues.length % 2 === 0
                ? (mttrValues[mttrValues.length / 2 - 1]! + mttrValues[mttrValues.length / 2]!) / 2
                : mttrValues[Math.floor(mttrValues.length / 2)]!;

        // Group by source
        const bySource = new Map<AndonTrigger, { total: number; count: number }>();
        resolvedEvents.forEach((e) => {
            const current = bySource.get(e.triggerSource) ?? { total: 0, count: 0 };
            bySource.set(e.triggerSource, {
                total: current.total + e.mttrMinutes!,
                count: current.count + 1,
            });
        });

        return {
            averageMttrMinutes: Math.round(average),
            medianMttrMinutes: Math.round(median),
            last30DaysCount: resolvedEvents.length,
            bySource: Array.from(bySource.entries()).map(([source, data]) => ({
                source,
                avgMttr: Math.round(data.total / data.count),
                count: data.count,
            })),
        };
    }

    /**
     * Check if system is in Andon state (for middleware)
     */
    async isAndonActive(organizationId: string): Promise<boolean> {
        const health = await prisma.systemHealth.findUnique({
            where: { organizationId },
            select: { status: true },
        });

        return health?.status === 'RED';
    }

    // ═══════════════════════════════════════════════════════════════════
    // WEBHOOK HANDLERS (for CI/CD integration)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Handle GitHub Actions workflow failure
     */
    async handleGitHubWorkflowFailure(
        organizationId: string,
        workflowPayload: {
            commitHash: string;
            commitAuthor: string;
            branchName: string;
            workflowUrl: string;
            errorMessage?: string;
        }
    ): Promise<AndonEvent> {
        return this.triggerAndon(organizationId, {
            source: 'CI_PIPELINE',
            severity: 'STOP_LINE',
            commitHash: workflowPayload.commitHash,
            commitAuthor: workflowPayload.commitAuthor,
            branchName: workflowPayload.branchName,
            pipelineUrl: workflowPayload.workflowUrl,
            errorLog: workflowPayload.errorMessage,
        });
    }

    /**
     * Handle coverage drop below threshold
     */
    async handleCoverageDrop(
        organizationId: string,
        coveragePayload: {
            coveragePercent: number;
            commitHash: string;
            commitAuthor: string;
        }
    ): Promise<AndonEvent | null> {
        if (coveragePayload.coveragePercent >= COVERAGE_THRESHOLD) {
            return null; // No action needed
        }

        return this.triggerAndon(organizationId, {
            source: 'COVERAGE_DROP',
            severity: 'WARNING',
            coveragePercent: coveragePayload.coveragePercent,
            commitHash: coveragePayload.commitHash,
            commitAuthor: coveragePayload.commitAuthor,
            errorLog: `Coverage dropped to ${coveragePayload.coveragePercent}% (threshold: ${COVERAGE_THRESHOLD}%)`,
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════

    private determineSeverity(payload: AndonTriggerPayload): AndonSeverity {
        // STOP_LINE sources
        if (
            payload.source === 'CI_PIPELINE' ||
            payload.source === 'DEPLOYMENT_FAILURE' ||
            payload.source === 'TEST_FAILURE'
        ) {
            return 'STOP_LINE';
        }

        // WARNING sources
        if (payload.source === 'COVERAGE_DROP' || payload.source === 'MONITORING_ALERT') {
            return 'WARNING';
        }

        // Manual triggers use provided severity or default to WARNING
        return 'WARNING';
    }
}

export const andonService = new AndonService();
