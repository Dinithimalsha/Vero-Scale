/**
 * Digital Heijunka - The Human-Machine Interface
 * Algorithmic Production Leveling and Resource Allocation
 * 
 * From "The Algorithmic Enterprise" Section 7:
 * "A Digital Heijunka system smooths flow by decoupling the production 
 * schedule from order arrival. It releases work at a sustainable rate,
 * ensuring constant, predictable flow while mixing work types."
 */

import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════
// TYPES (Section 7.1 - The Algorithmic Backlog)
// ═══════════════════════════════════════════════════════════════════

export type WorkType = 'FEATURE' | 'BUG' | 'TECH_DEBT' | 'MAINTENANCE' | 'SPIKE';

export interface WorkItem {
    id: string;
    title: string;
    workType: WorkType;
    storyPoints: number;
    wsjfScore?: number;         // Weighted Shortest Job First
    priority: number;           // 1-10, derived from WSJF or QV
    assigneeId?: string;
    status: 'QUEUED' | 'READY' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
    createdAt: Date;
    estimatedCycleTime?: number; // Hours
    actualCycleTime?: number;
}

export interface HeijunkaSchedule {
    pitchId: string;
    pitchName: string;          // e.g., "Sprint 24" or "Week 12"
    startDate: Date;
    endDate: Date;
    capacityPoints: number;     // Team velocity
    allocatedItems: ScheduledItem[];
    workMix: WorkMix;
    bufferPoints: number;       // Slack for unexpected work
}

export interface ScheduledItem {
    workItem: WorkItem;
    scheduledSlot: number;      // Which "time box" it's scheduled in
    estimatedStartDate: Date;
    estimatedEndDate: Date;
}

export interface WorkMix {
    feature: number;            // Percentage (0-100)
    bug: number;
    techDebt: number;
    maintenance: number;
    spike: number;
}

export interface TeamCapacity {
    teamId: string;
    teamName: string;
    members: TeamMember[];
    taktTime: number;           // Average cycle time per point (hours)
    velocity: number;           // Points per sprint
    wipLimit: number;           // Max concurrent items
}

export interface TeamMember {
    id: string;
    name: string;
    skills: string[];
    availability: number;       // 0-100%
    currentLoad: number;        // Assigned story points
    hourlyRate: number;
}

export interface ResourceAllocation {
    memberId: string;
    workItemId: string;
    allocationPercentage: number;
    expectedValue: number;      // From QV or business value
    opportunityCost: number;    // Value of alternatives foregone
}

// ═══════════════════════════════════════════════════════════════════
// WSJF CALCULATOR
// Weighted Shortest Job First = Cost of Delay / Job Size
// ═══════════════════════════════════════════════════════════════════

export class WSJFCalculator {
    /**
     * Calculate WSJF score for prioritization
     * WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size
     */
    calculate(item: {
        businessValue: number;      // 1-10: User/Business value
        timeCriticality: number;    // 1-10: How much value decays with time
        riskReduction: number;      // 1-10: Risk/opportunity enablement
        jobSize: number;            // Story points
    }): number {
        const costOfDelay = item.businessValue + item.timeCriticality + item.riskReduction;
        const wsjf = costOfDelay / item.jobSize;
        return Math.round(wsjf * 100) / 100;
    }

    /**
     * Calculate WSJF for all items and sort by priority
     */
    prioritize(items: Array<WorkItem & {
        businessValue: number;
        timeCriticality: number;
        riskReduction: number;
    }>): WorkItem[] {
        return items
            .map(item => ({
                ...item,
                wsjfScore: this.calculate({
                    businessValue: item.businessValue,
                    timeCriticality: item.timeCriticality,
                    riskReduction: item.riskReduction,
                    jobSize: item.storyPoints,
                }),
            }))
            .sort((a, b) => (b.wsjfScore || 0) - (a.wsjfScore || 0));
    }
}

// ═══════════════════════════════════════════════════════════════════
// HEIJUNKA SCHEDULER
// Production leveling algorithm that smooths workflow
// ═══════════════════════════════════════════════════════════════════

export class HeijunkaScheduler {
    private wsjf = new WSJFCalculator();

    // Default target work mix (can be configured per organization)
    private readonly DEFAULT_MIX: WorkMix = {
        feature: 60,
        bug: 15,
        techDebt: 15,
        maintenance: 5,
        spike: 5,
    };

    /**
     * Create a leveled schedule from backlog
     * "The Heijunka algorithm decouples the production schedule from order arrival.
     * It queues work and releases at a sustainable rate."
     */
    createSchedule(
        backlog: WorkItem[],
        capacity: TeamCapacity,
        pitchDuration: number = 14, // Default 2-week sprint
        targetMix?: WorkMix
    ): HeijunkaSchedule {
        const mix = targetMix || this.DEFAULT_MIX;
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + pitchDuration * 24 * 60 * 60 * 1000);

        // Sort backlog by WSJF/priority
        const sortedBacklog = [...backlog].sort((a, b) =>
            (b.wsjfScore || b.priority) - (a.wsjfScore || a.priority)
        );

        // Calculate available capacity with buffer
        const bufferPercentage = 0.15; // 15% buffer for unexpected work
        const usableCapacity = Math.floor(capacity.velocity * (1 - bufferPercentage));
        const bufferPoints = capacity.velocity - usableCapacity;

        // Allocate by work type mix
        const allocatedItems: ScheduledItem[] = [];
        let remainingCapacity = usableCapacity;

        // Track allocated points per type
        const allocatedByType: Record<WorkType, number> = {
            FEATURE: 0,
            BUG: 0,
            TECH_DEBT: 0,
            MAINTENANCE: 0,
            SPIKE: 0,
        };

        // First pass: Allocate high-priority items respecting mix
        for (const item of sortedBacklog) {
            if (remainingCapacity < item.storyPoints) continue;

            const typeLimit = this.getTypeLimitPoints(item.workType, mix, usableCapacity);
            if (allocatedByType[item.workType] + item.storyPoints > typeLimit) {
                continue; // Skip if would exceed mix target
            }

            const slot = allocatedItems.length;
            const estimatedStartDate = this.calculateSlotDate(startDate, slot, capacity.taktTime);
            const estimatedEndDate = new Date(
                estimatedStartDate.getTime() + (item.estimatedCycleTime || item.storyPoints * capacity.taktTime) * 60 * 60 * 1000
            );

            allocatedItems.push({
                workItem: item,
                scheduledSlot: slot,
                estimatedStartDate,
                estimatedEndDate,
            });

            allocatedByType[item.workType] += item.storyPoints;
            remainingCapacity -= item.storyPoints;
        }

        // Second pass: Fill remaining capacity with any priority items
        for (const item of sortedBacklog) {
            if (remainingCapacity < item.storyPoints) continue;
            if (allocatedItems.some(a => a.workItem.id === item.id)) continue;

            const slot = allocatedItems.length;
            const estimatedStartDate = this.calculateSlotDate(startDate, slot, capacity.taktTime);
            const estimatedEndDate = new Date(
                estimatedStartDate.getTime() + (item.estimatedCycleTime || item.storyPoints * capacity.taktTime) * 60 * 60 * 1000
            );

            allocatedItems.push({
                workItem: item,
                scheduledSlot: slot,
                estimatedStartDate,
                estimatedEndDate,
            });

            remainingCapacity -= item.storyPoints;
        }

        // Calculate actual work mix achieved
        const actualMix = this.calculateActualMix(allocatedItems);

        return {
            pitchId: `pitch-${crypto.randomUUID().slice(0, 8)}`,
            pitchName: `Sprint ${new Date().toISOString().slice(0, 10)}`,
            startDate,
            endDate,
            capacityPoints: capacity.velocity,
            allocatedItems,
            workMix: actualMix,
            bufferPoints,
        };
    }

    /**
     * Detect Mura (unevenness) in the schedule
     */
    detectMura(schedule: HeijunkaSchedule): {
        hasUnevenness: boolean;
        issues: string[];
        recommendations: string[];
    } {
        const issues: string[] = [];
        const recommendations: string[] = [];

        // Check if any slot is overloaded
        const slotLoads = new Map<number, number>();
        for (const item of schedule.allocatedItems) {
            const current = slotLoads.get(item.scheduledSlot) || 0;
            slotLoads.set(item.scheduledSlot, current + item.workItem.storyPoints);
        }

        const avgLoad = schedule.capacityPoints / schedule.allocatedItems.length;
        for (const [slot, load] of slotLoads) {
            if (load > avgLoad * 1.5) {
                issues.push(`Slot ${slot} is overloaded (${load} points vs ${avgLoad.toFixed(1)} average)`);
                recommendations.push(`Consider splitting work in slot ${slot} across multiple days`);
            }
        }

        // Check work mix balance
        const mix = schedule.workMix;
        if (mix.feature > 80) {
            issues.push('Feature work dominates the sprint (>80%)');
            recommendations.push('Add more tech debt or maintenance work to prevent burnout');
        }
        if (mix.bug > 30) {
            issues.push('Bug fixes consuming too much capacity (>30%)');
            recommendations.push('Investigate root cause of bug influx');
        }

        return {
            hasUnevenness: issues.length > 0,
            issues,
            recommendations,
        };
    }

    private getTypeLimitPoints(type: WorkType, mix: WorkMix, totalCapacity: number): number {
        const percentage = {
            FEATURE: mix.feature,
            BUG: mix.bug,
            TECH_DEBT: mix.techDebt,
            MAINTENANCE: mix.maintenance,
            SPIKE: mix.spike,
        }[type];
        return Math.floor(totalCapacity * (percentage / 100));
    }

    private calculateSlotDate(startDate: Date, slot: number, taktTime: number): Date {
        const hoursPerSlot = 8; // Assume 8-hour work days
        return new Date(startDate.getTime() + slot * hoursPerSlot * 60 * 60 * 1000);
    }

    private calculateActualMix(items: ScheduledItem[]): WorkMix {
        const totalPoints = items.reduce((sum, i) => sum + i.workItem.storyPoints, 0);
        if (totalPoints === 0) {
            return { feature: 0, bug: 0, techDebt: 0, maintenance: 0, spike: 0 };
        }

        const byType: Record<WorkType, number> = {
            FEATURE: 0, BUG: 0, TECH_DEBT: 0, MAINTENANCE: 0, SPIKE: 0,
        };

        for (const item of items) {
            byType[item.workItem.workType] += item.workItem.storyPoints;
        }

        return {
            feature: Math.round((byType.FEATURE / totalPoints) * 100),
            bug: Math.round((byType.BUG / totalPoints) * 100),
            techDebt: Math.round((byType.TECH_DEBT / totalPoints) * 100),
            maintenance: Math.round((byType.MAINTENANCE / totalPoints) * 100),
            spike: Math.round((byType.SPIKE / totalPoints) * 100),
        };
    }
}

// ═══════════════════════════════════════════════════════════════════
// ALGORITHMIC RESOURCE ALLOCATOR (Section 7.2)
// "Solve the Knapsack Problem of staffing using Greedy Algorithms"
// ═══════════════════════════════════════════════════════════════════

export class ResourceAllocator {
    /**
     * Greedy algorithm for resource allocation
     * Maximizes value by assigning highest-value work to available resources
     */
    allocateGreedy(
        workItems: WorkItem[],
        team: TeamMember[]
    ): ResourceAllocation[] {
        const allocations: ResourceAllocation[] = [];

        // Sort work by value (WSJF or priority)
        const sortedWork = [...workItems].sort((a, b) =>
            (b.wsjfScore || b.priority) - (a.wsjfScore || a.priority)
        );

        // Track remaining capacity per member
        const memberCapacity = new Map<string, number>();
        for (const member of team) {
            memberCapacity.set(member.id, member.availability - member.currentLoad);
        }

        // Greedy assignment: highest value work to first available qualified member
        for (const work of sortedWork) {
            const requiredCapacity = work.storyPoints * 10; // Assume 10% per point

            // Find best available member (could be enhanced with skill matching)
            let bestMember: TeamMember | null = null;
            let bestCapacity = 0;

            for (const member of team) {
                const available = memberCapacity.get(member.id) || 0;
                if (available >= requiredCapacity && available > bestCapacity) {
                    bestMember = member;
                    bestCapacity = available;
                }
            }

            if (bestMember) {
                allocations.push({
                    memberId: bestMember.id,
                    workItemId: work.id,
                    allocationPercentage: requiredCapacity,
                    expectedValue: work.wsjfScore || work.priority,
                    opportunityCost: 0, // Simplified
                });

                const newCapacity = (memberCapacity.get(bestMember.id) || 0) - requiredCapacity;
                memberCapacity.set(bestMember.id, newCapacity);
            }
        }

        return allocations;
    }

    /**
     * Detect blocking situations and recommend re-allocation
     */
    detectBlockers(
        allocations: ResourceAllocation[],
        workItems: WorkItem[],
        team: TeamMember[]
    ): {
        blockedItems: WorkItem[];
        recommendations: Array<{
            action: string;
            from: string;
            to: string;
            reason: string;
        }>;
    } {
        const blockedItems = workItems.filter(w =>
            w.status === 'QUEUED' &&
            !allocations.some(a => a.workItemId === w.id)
        );

        const recommendations: Array<{
            action: string;
            from: string;
            to: string;
            reason: string;
        }> = [];

        // Find high-value blocked items
        const highValueBlocked = blockedItems
            .filter(w => (w.wsjfScore || w.priority) >= 7)
            .slice(0, 3);

        for (const blocked of highValueBlocked) {
            // Find lowest-value assigned work
            const lowestValue = allocations
                .filter(a => a.expectedValue < (blocked.wsjfScore || blocked.priority))
                .sort((a, b) => a.expectedValue - b.expectedValue)[0];

            if (lowestValue) {
                const member = team.find(m => m.id === lowestValue.memberId);
                recommendations.push({
                    action: 'SWAP',
                    from: lowestValue.workItemId,
                    to: blocked.id,
                    reason: `High-value item "${blocked.title}" is blocked. ` +
                        `Consider swapping from ${member?.name || 'team member'}'s current work.`,
                });
            }
        }

        return { blockedItems, recommendations };
    }

    /**
     * Calculate team utilization metrics
     */
    calculateUtilization(
        team: TeamMember[],
        allocations: ResourceAllocation[]
    ): {
        overallUtilization: number;
        byMember: Array<{ memberId: string; name: string; utilization: number }>;
        underutilized: string[];
        overloaded: string[];
    } {
        const memberAllocations = new Map<string, number>();

        for (const alloc of allocations) {
            const current = memberAllocations.get(alloc.memberId) || 0;
            memberAllocations.set(alloc.memberId, current + alloc.allocationPercentage);
        }

        const byMember = team.map(m => ({
            memberId: m.id,
            name: m.name,
            utilization: memberAllocations.get(m.id) || 0,
        }));

        const overallUtilization = byMember.reduce((sum, m) => sum + m.utilization, 0) / team.length;

        return {
            overallUtilization,
            byMember,
            underutilized: byMember.filter(m => m.utilization < 60).map(m => m.name),
            overloaded: byMember.filter(m => m.utilization > 100).map(m => m.name),
        };
    }
}

export const wsjfCalculator = new WSJFCalculator();
export const heijunkaScheduler = new HeijunkaScheduler();
export const resourceAllocator = new ResourceAllocator();
