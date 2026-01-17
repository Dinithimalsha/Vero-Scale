import { prisma } from '../../../shared/prisma';
// import { DtoActivityEvent } from '@prisma/client'; // Removed due to IDE resolution issue
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════
// CORE DTO TYPES (Section 2.1.1 - The DTO Data Schema)
// ═══════════════════════════════════════════════════════════════════

export interface ActivityNode {
    id: string;
    organizationId: string;
    timestamp: Date;
    actorId: string;
    actorType: string;
    duration: number;
    costAllocation: number;
    caseId: string;
    nodeType: string;
    metadata: any;
    createdAt: Date;
}

export interface CaseTrace {
    caseId: string;
    processType: string;
    startTime: Date;
    endTime?: Date;
    outcomeStatus: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'BLOCKED';
    value: number;
    events: ActivityNode[];
}

export interface ResourceAgent {
    resourceId: string;
    resourceType: 'HUMAN' | 'AI_AGENT' | 'SERVICE';
    role: string;
    hourlyRate: number;
    skillVector: string[];
    availability: number;
    currentLoad: number;
}

export interface QueueBuffer {
    queueId: string;
    name: string;
    wipLimit: number;
    currentLoad: number;
    averageWaitTime: number;
    processType: string;
}

export interface EdgeTransition {
    sourceNode: string;
    targetNode: string;
    probability: number;
    averageLatency: number;
    transitionCount: number;
}

export interface FlowAnalysis {
    valueStreamId: string;
    totalProcessTime: number;
    totalLeadTime: number;
    flowEfficiency: number;
    bottlenecks: Array<{
        nodeType: string;
        averageWaitTime: number;
        utilizationRate: number;
    }>;
    wasteHeatmap: Array<{
        transition: string;
        wasteTime: number;
        wastePercentage: number;
    }>;
}

export type AndonTriggerType =
    | 'QUALITY_THRESHOLD_BREACH'
    | 'PIPELINE_FAILURE_SPIKE'
    | 'WIP_LIMIT_EXCEEDED'
    | 'MANUAL_CORD_PULL'
    | 'SLA_BREACH_IMMINENT';

export interface AndonCordEvent {
    id: string;
    triggerType: AndonTriggerType;
    detectedAt: Date;
    resolvedAt?: Date;
    affectedProcess: string;
    metricValue: number;
    threshold: number;
    sigma: number;
    status: 'ACTIVE' | 'SWARMING' | 'RCA_IN_PROGRESS' | 'RESOLVED';
    countermeasure?: string;
    rcaLogId?: string;
}

// ═══════════════════════════════════════════════════════════════════
// DTO SERVICE (Prisma Implementation)
// ═══════════════════════════════════════════════════════════════════

export class DigitalTwinService {
    /**
     * Record an activity event (Event Sourcing pattern)
     */
    async recordActivity(
        organizationId: string,
        activity: Omit<ActivityNode, 'id' | 'eventId' | 'costAllocation' | 'organizationId' | 'createdAt'> & { eventId?: string }
    ): Promise<ActivityNode> {
        const actor = await this.getResourceAgent(activity.actorId);
        const durationHours = activity.duration / (1000 * 60 * 60);
        const costAllocation = actor ? actor.hourlyRate * durationHours : 0;

        const event = await (prisma as any).dtoActivityEvent.create({
            data: {
                organizationId,
                timestamp: activity.timestamp,
                actorId: activity.actorId,
                actorType: activity.actorType,
                duration: activity.duration,
                costAllocation,
                caseId: activity.caseId,
                nodeType: activity.nodeType,
                metadata: activity.metadata || {},
            }
        });

        return event as ActivityNode;
    }

    /**
     * Ingest Jira Webhook Event
     * Maps Issue Transitions to Activity Nodes
     */
    async ingestJiraEvent(organizationId: string, payload: any): Promise<ActivityNode | null> {
        // Only processing transitions for now
        if (payload.webhookEvent !== 'jira:issue_updated') return null;

        const issueKey = payload.issue.key;
        const changelog = payload.changelog;

        // Check if status changed
        const statusChange = changelog?.items?.find((i: any) => i.field === 'status');
        if (!statusChange) return null;

        const newStatus = statusChange.fromString + '_TO_' + statusChange.toString;
        const actor = payload.user.displayName || payload.user.name;

        return this.recordActivity(organizationId, {
            caseId: issueKey,
            nodeType: `JIRA_${newStatus.toUpperCase().replace(/\s+/g, '_')}`,
            actorId: actor,
            actorType: 'HUMAN',
            timestamp: new Date(),
            duration: 0, // Transition is instantaneous, wait time is calculated between nodes
            metadata: {
                jiraId: payload.issue.id,
                fromStatus: statusChange.fromString,
                toStatus: statusChange.toString,
                summary: payload.issue.fields.summary,
            }
        });
    }

    /**
     * Ingest Calendar Event
     * Maps Meetings to Activity Nodes (Wait Time / Overhead)
     */
    async ingestCalendarEvent(organizationId: string, payload: any): Promise<ActivityNode> {
        const startTime = new Date(payload.start);
        const endTime = new Date(payload.end);
        const duration = endTime.getTime() - startTime.getTime();

        // Heuristic: Assign to "General Overhead" case or Project Case if mentioned
        const caseId = payload.projectKey || 'OVERHEAD-2024';

        return this.recordActivity(organizationId, {
            caseId,
            nodeType: 'MEETING',
            actorId: payload.organizer.email,
            actorType: 'HUMAN',
            timestamp: startTime,
            duration,
            metadata: {
                subject: payload.subject,
                attendees: payload.attendees?.length || 0,
                platform: 'CALENDAR',
            }
        });
    }

    /**
     * Reconstruct a Case (process instance) from event history
     */
    async reconstructCase(caseId: string): Promise<CaseTrace> {
        const events = await (prisma as any).dtoActivityEvent.findMany({
            where: { caseId },
            orderBy: { timestamp: 'asc' }
        });

        if (events.length === 0) {
            throw new Error(`Case ${caseId} not found`);
        }

        const firstEvent = events[0];
        const lastEvent = events[events.length - 1];

        const hasCompletionEvent = events.some((e: any) =>
            e.nodeType === 'COMPLETED' || e.nodeType === 'DEPLOYED' || e.nodeType === 'CLOSED'
        );
        const hasFailureEvent = events.some((e: any) =>
            e.nodeType === 'FAILED' || e.nodeType === 'REJECTED' || e.nodeType === 'CANCELLED'
        );

        let status: CaseTrace['outcomeStatus'] = 'IN_PROGRESS';
        if (hasCompletionEvent) status = 'COMPLETED';
        if (hasFailureEvent) status = 'FAILED';

        return {
            caseId,
            processType: this.inferProcessType(events as ActivityNode[]),
            startTime: firstEvent.timestamp,
            endTime: hasCompletionEvent || hasFailureEvent ? lastEvent.timestamp : undefined,
            outcomeStatus: status,
            value: this.calculateCaseValue(events as ActivityNode[]),
            events: events as ActivityNode[],
        };
    }

    /**
     * Calculate MBPM Metrics for a value stream
     */
    async calculateFlowMetrics(
        organizationId: string,
        _processType: string,
        startDate: Date,
        endDate: Date
    ): Promise<FlowAnalysis> {
        const events = await (prisma as any).dtoActivityEvent.findMany({
            where: {
                organizationId,
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                }
            },
            orderBy: { timestamp: 'asc' }
        });

        const caseGroups = new Map<string, ActivityNode[]>();
        for (const event of events) {
            const existing = caseGroups.get(event.caseId) || [];
            existing.push(event as ActivityNode);
            caseGroups.set(event.caseId, existing);
        }

        let totalProcessTime = 0;
        let totalLeadTime = 0;
        const nodeWaitTimes = new Map<string, number[]>();

        for (const [, caseEvents] of caseGroups) {
            const processTime = caseEvents.reduce((sum: number, e: ActivityNode) => sum + e.duration, 0);
            totalProcessTime += processTime;

            if (caseEvents.length >= 2) {
                const leadTime = caseEvents[caseEvents.length - 1].timestamp.getTime() -
                    caseEvents[0].timestamp.getTime();
                totalLeadTime += leadTime;

                for (let i = 1; i < caseEvents.length; i++) {
                    const waitTime = caseEvents[i].timestamp.getTime() -
                        (caseEvents[i - 1].timestamp.getTime() + caseEvents[i - 1].duration);
                    if (waitTime > 0) {
                        const transition = `${caseEvents[i - 1].nodeType} → ${caseEvents[i].nodeType}`;
                        const existing = nodeWaitTimes.get(transition) || [];
                        existing.push(waitTime);
                        nodeWaitTimes.set(transition, existing);
                    }
                }
            }
        }

        const flowEfficiency = totalLeadTime > 0
            ? (totalProcessTime / totalLeadTime) * 100
            : 0;

        const wasteHeatmap = Array.from(nodeWaitTimes.entries())
            .map(([transition, times]) => ({
                transition,
                wasteTime: times.reduce((a, b) => a + b, 0) / times.length,
                wastePercentage: (times.reduce((a, b) => a + b, 0) / totalLeadTime) * 100,
            }))
            .sort((a, b) => b.wasteTime - a.wasteTime);

        return {
            valueStreamId: `${_processType}-${startDate.toISOString()}`,
            totalProcessTime,
            totalLeadTime,
            flowEfficiency,
            bottlenecks: wasteHeatmap.slice(0, 5).map(w => ({
                nodeType: w.transition,
                averageWaitTime: w.wasteTime,
                utilizationRate: 100 - w.wastePercentage,
            })),
            wasteHeatmap,
        };
    }

    /**
     * Digital Andon Cord - Detect anomalies and trigger stop-the-line
     */
    async evaluateAndonConditions(
        organizationId: string,
        processType: string
    ): Promise<AndonCordEvent | null> {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

        const flowMetrics = await this.calculateFlowMetrics(
            organizationId,
            processType,
            startDate,
            endDate
        );

        // Fetch recent events to calc quality CA
        const recentEvents = await (prisma as any).dtoActivityEvent.findMany({
            where: {
                organizationId,
                timestamp: { gte: startDate }
            }
        });

        const completedEvents = recentEvents.filter((e: any) =>
            e.nodeType === 'COMPLETED' || e.nodeType === 'APPROVED'
        );
        const reworkEvents = recentEvents.filter((e: any) =>
            e.nodeType === 'REWORK' || e.nodeType === 'REJECTED'
        );

        const percentCA = completedEvents.length > 0
            ? ((completedEvents.length - reworkEvents.length) / completedEvents.length) * 100
            : 100;

        const QUALITY_THRESHOLD = 80;
        const FLOW_EFFICIENCY_THRESHOLD = 10;

        if (percentCA < QUALITY_THRESHOLD) {
            return {
                id: crypto.randomUUID(),
                triggerType: 'QUALITY_THRESHOLD_BREACH',
                detectedAt: new Date(),
                affectedProcess: processType,
                metricValue: percentCA,
                threshold: QUALITY_THRESHOLD,
                sigma: this.calculateSigmaDeviation(percentCA, QUALITY_THRESHOLD),
                status: 'ACTIVE',
            };
        }

        if (flowMetrics.flowEfficiency < FLOW_EFFICIENCY_THRESHOLD) {
            return {
                id: crypto.randomUUID(),
                triggerType: 'WIP_LIMIT_EXCEEDED',
                detectedAt: new Date(),
                affectedProcess: processType,
                metricValue: flowMetrics.flowEfficiency,
                threshold: FLOW_EFFICIENCY_THRESHOLD,
                sigma: this.calculateSigmaDeviation(flowMetrics.flowEfficiency, FLOW_EFFICIENCY_THRESHOLD),
                status: 'ACTIVE',
            };
        }

        return null;
    }

    /**
     * Get queue buffer status for WIP limit enforcement
     */
    async getQueueStatus(organizationId: string): Promise<QueueBuffer[]> {
        const events = await (prisma as any).dtoActivityEvent.findMany({
            where: {
                organizationId,
                timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
        });

        const queues = new Map<string, { count: number; waitTimes: number[] }>();

        for (const event of events) {
            const queueName = event.nodeType;
            const existing = queues.get(queueName) || { count: 0, waitTimes: [] };
            existing.count++;
            queues.set(queueName, existing);
        }

        return Array.from(queues.entries()).map(([name, data]) => ({
            queueId: name,
            name,
            wipLimit: 10,
            currentLoad: data.count,
            averageWaitTime: data.waitTimes.length > 0
                ? data.waitTimes.reduce((a, b) => a + b, 0) / data.waitTimes.length
                : 0,
            processType: 'GENERAL',
        }));
    }

    /**
     * Mine process transitions to build the process graph
     */
    async mineProcessGraph(
        organizationId: string,
        _processType: string
    ): Promise<EdgeTransition[]> {
        // Warning: This could be heavy in a real DB
        const events = await (prisma as any).dtoActivityEvent.findMany({
            where: { organizationId },
            orderBy: [
                { caseId: 'asc' },
                { timestamp: 'asc' }
            ]
        });

        const transitionCounts = new Map<string, { count: number; latencies: number[] }>();
        let currentCaseId = '';
        let previousEvent: ActivityNode | null = null;

        for (const rawEvent of events) {
            const event = rawEvent as ActivityNode;
            if (event.caseId !== currentCaseId) {
                currentCaseId = event.caseId;
                previousEvent = null;
            }

            if (previousEvent) {
                const key = `${previousEvent.nodeType}→${event.nodeType}`;
                const existing = transitionCounts.get(key) || { count: 0, latencies: [] };
                existing.count++;
                existing.latencies.push(
                    event.timestamp.getTime() - previousEvent.timestamp.getTime()
                );
                transitionCounts.set(key, existing);
            }

            previousEvent = event;
        }

        const totalTransitions = Array.from(transitionCounts.values())
            .reduce((sum, t) => sum + t.count, 0);

        return Array.from(transitionCounts.entries()).map(([key, data]) => {
            const [source, target] = key.split('→');
            return {
                sourceNode: source,
                targetNode: target,
                probability: totalTransitions > 0 ? data.count / totalTransitions : 0,
                averageLatency: data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length,
                transitionCount: data.count,
            };
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════

    private async getResourceAgent(actorId: string): Promise<ResourceAgent | null> {
        // In valid impl, look up agent/user table.
        return {
            resourceId: actorId,
            resourceType: 'HUMAN',
            role: 'MEMBER',
            hourlyRate: 75,
            skillVector: [],
            availability: 100,
            currentLoad: 0,
        };
    }

    private inferProcessType(events: ActivityNode[]): string {
        const nodeTypes = events.map(e => e.nodeType);
        if (nodeTypes.includes('DEPLOY') || nodeTypes.includes('MERGE')) return 'FEATURE_DELIVERY';
        if (nodeTypes.includes('INCIDENT') || nodeTypes.includes('ALERT')) return 'INCIDENT_RESPONSE';
        if (nodeTypes.includes('ONBOARD')) return 'EMPLOYEE_ONBOARDING';
        return 'GENERAL_WORKFLOW';
    }

    private calculateCaseValue(events: ActivityNode[]): number {
        return events.reduce((sum, e) => sum + e.costAllocation, 0);
    }

    private calculateSigmaDeviation(value: number, threshold: number): number {
        const deviation = Math.abs(value - threshold);
        // Assuming 15% standard deviation for demo
        return deviation / (threshold * 0.15);
    }
}

export const digitalTwinService = new DigitalTwinService();
