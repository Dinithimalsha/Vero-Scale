/**
 * Heijunka Service - Digital Production Leveling Engine
 * Implements Toyota Production System principles for software
 * 
 * CEO Review Incorporated:
 * - Takt time connection to customer demand
 * - Velocity calculation with weighted averages
 * - Product mix control (Feature/Bug/Debt ratios)
 */

import { prisma } from '../../../config/database';
import type { ProductionPitch, TaskType } from '@prisma/client';
import { errors } from '../../../shared/middleware/error-handler';
import { quadraticVotingService } from '../../governance/services/quadratic-voting.service';
import { unitEconomicsService } from '../../sales/services/unit-economics.service';

export const STANDARD_CONFIG = {
    FEATURE: 0.60,
    DEBT: 0.15,
    BUG: 0.15,
    SECURITY: 0.10
};

export const CRISIS_CONFIG = {
    FEATURE: 0.10, // Only critical features
    DEBT: 0.90,    // All hands on deck for Retention/Optimization
    BUG: 0.0,
    SECURITY: 0.0
};

// Task item type for type-safe callbacks
interface TaskItem {
    id: string;
    title: string;
    storyPoints: number;
    priorityScore: number | { toNumber(): number } | { toString(): string };
    taskType: TaskType;
    status: string;
}

// Type for pitch with tasks included
type PitchWithTasks = ProductionPitch & {
    tasks: TaskItem[];
};

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface VelocityMetrics {
    rollingAverageVelocity: number;
    standardDeviation: number;
    recommendedPitchCapacity: number;
    lastNPitches: number;
    byType: {
        feature: number;
        bug: number;
        debt: number;
    };
}

export interface ProductMixAnalysis {
    currentRatio: { feature: number; bug: number; debt: number };
    targetRatio: { feature: number; bug: number; debt: number };
    imbalance: { type: TaskType; deviation: number } | null;
}

export interface SwapSuggestion {
    taskId: string;
    title: string;
    storyPoints: number;
    priorityScore: number;
    taskType: TaskType;
}

export interface AssignmentResult {
    success: boolean;
    error?: 'CAPACITY_EXCEEDED' | 'MIX_IMBALANCE' | 'PITCH_LOCKED';
    currentLoad?: number;
    capacity?: number;
    overflowBy?: number;
    swapSuggestions?: SwapSuggestion[];
    mixAnalysis?: ProductMixAnalysis;
}

export interface CreatePitchInput {
    organizationId: string;
    name: string;
    startTime: Date;
    endTime: Date;
    capacityOverride?: number;
    demandUnitsExpected?: number;
}

// ═══════════════════════════════════════════════════════════════════
// HEIJUNKA SERVICE
// ═══════════════════════════════════════════════════════════════════

export class HeijunkaService {
    /**
     * Calculate rolling velocity from last N completed pitches
     * Uses weighted average (recent pitches weighted higher)
     */
    async calculateRollingVelocity(
        organizationId: string,
        pitchCount: number = 5
    ): Promise<VelocityMetrics> {
        const completedPitches = await prisma.productionPitch.findMany({
            where: {
                organizationId,
                status: 'COMPLETED',
            },
            orderBy: { endTime: 'desc' },
            take: pitchCount,
            include: {
                tasks: {
                    where: { status: 'DONE' },
                },
            },
        });

        if (completedPitches.length === 0) {
            return {
                rollingAverageVelocity: 0,
                standardDeviation: 0,
                recommendedPitchCapacity: 20, // Default for new orgs
                lastNPitches: 0,
                byType: { feature: 0, bug: 0, debt: 0 },
            };
        }

        // Weighted velocity calculation (most recent = highest weight)
        const weights = [0.35, 0.25, 0.20, 0.12, 0.08];
        let weightedSum = 0;
        let weightTotal = 0;
        const velocities: number[] = [];

        let totalFeature = 0;
        let totalBug = 0;
        let totalDebt = 0;

        completedPitches.forEach((pitch: PitchWithTasks, i: number) => {
            const velocity = pitch.tasks.reduce((sum: number, t: TaskItem) => sum + t.storyPoints, 0);
            velocities.push(velocity);

            const weight = weights[i] ?? 0.05;
            weightedSum += velocity * weight;
            weightTotal += weight;

            // Track by type
            pitch.tasks.forEach((t: TaskItem) => {
                if (t.taskType === 'FEATURE') totalFeature += t.storyPoints;
                if (t.taskType === 'BUG') totalBug += t.storyPoints;
                if (t.taskType === 'DEBT') totalDebt += t.storyPoints;
            });
        });

        const rollingAvg = weightTotal > 0 ? weightedSum / weightTotal : 0;
        const stdDev = this.calculateStdDev(velocities, rollingAvg);

        return {
            rollingAverageVelocity: Math.round(rollingAvg),
            standardDeviation: Math.round(stdDev * 10) / 10,
            recommendedPitchCapacity: Math.round(rollingAvg * 0.85), // 85% buffer
            lastNPitches: completedPitches.length,
            byType: {
                feature: Math.round(totalFeature / completedPitches.length),
                bug: Math.round(totalBug / completedPitches.length),
                debt: Math.round(totalDebt / completedPitches.length),
            },
        };
    }

    /**
     * Create a new production pitch with auto-calculated capacity
     */
    async createPitch(input: CreatePitchInput): Promise<ProductionPitch> {
        const velocity = await this.calculateRollingVelocity(input.organizationId);

        const capacityPoints = input.capacityOverride ?? velocity.recommendedPitchCapacity;

        return prisma.productionPitch.create({
            data: {
                organizationId: input.organizationId,
                name: input.name,
                startTime: input.startTime,
                endTime: input.endTime,
                capacityPoints,
                demandUnitsExpected: input.demandUnitsExpected,
                status: 'OPEN',
            },
        });
    }

    /**
     * Analyze product mix (Feature/Bug/Debt ratio) for a pitch
     * Per CEO: Control is critical for avoiding tunnel vision
     */
    async analyzeProductMix(
        organizationId: string,
        pitchId: string
    ): Promise<ProductMixAnalysis> {
        const [org, pitch] = await Promise.all([
            prisma.organization.findUnique({ where: { id: organizationId } }),
            prisma.productionPitch.findUnique({
                where: { id: pitchId },
                include: { tasks: true },
            }),
        ]);

        if (!org || !pitch) {
            throw errors.notFound('Organization or Pitch');
        }

        const targetRatio = {
            feature: org.featureRatio,
            bug: org.bugRatio,
            debt: org.debtRatio,
        };

        const totalPoints = pitch.currentLoad || 1;
        const currentRatio = {
            feature: Math.round((pitch.featurePoints / totalPoints) * 100),
            bug: Math.round((pitch.bugPoints / totalPoints) * 100),
            debt: Math.round((pitch.debtPoints / totalPoints) * 100),
        };

        // Find largest imbalance
        const deviations = [
            { type: 'FEATURE' as TaskType, deviation: currentRatio.feature - targetRatio.feature },
            { type: 'BUG' as TaskType, deviation: currentRatio.bug - targetRatio.bug },
            { type: 'DEBT' as TaskType, deviation: currentRatio.debt - targetRatio.debt },
        ];

        const maxDeviation = deviations.reduce((max, d) =>
            Math.abs(d.deviation) > Math.abs(max.deviation) ? d : max
        );

        return {
            currentRatio,
            targetRatio,
            imbalance: Math.abs(maxDeviation.deviation) > 10 ? maxDeviation : null,
        };
    }

    /**
     * Assign task to pitch with capacity and mix enforcement
     * Returns swap suggestions if over capacity
     */
    async assignTaskToPitch(
        taskId: string,
        pitchId: string,
        forceAssignment: boolean = false
    ): Promise<AssignmentResult> {
        const [pitch, task] = await Promise.all([
            prisma.productionPitch.findUnique({
                where: { id: pitchId },
                include: { tasks: true, organization: true },
            }),
            prisma.task.findUnique({ where: { id: taskId } }),
        ]);

        if (!pitch || !task) {
            throw errors.notFound('Pitch or Task');
        }

        // Check if pitch is locked
        if (pitch.status === 'LOCKED' || pitch.status === 'COMPLETED') {
            return {
                success: false,
                error: 'PITCH_LOCKED',
            };
        }

        // Check capacity (Muri prevention)
        const projectedLoad = pitch.currentLoad + task.storyPoints;

        if (projectedLoad > pitch.capacityPoints && !forceAssignment) {
            const swapCandidates = pitch.tasks
                .filter((t: TaskItem) => t.storyPoints >= task.storyPoints && t.id !== taskId)
                .sort((a: TaskItem, b: TaskItem) => Number(a.priorityScore) - Number(b.priorityScore)); // Lower priority first

            return {
                success: false,
                error: 'CAPACITY_EXCEEDED',
                currentLoad: pitch.currentLoad,
                capacity: pitch.capacityPoints,
                overflowBy: projectedLoad - pitch.capacityPoints,
                swapSuggestions: swapCandidates.slice(0, 3).map((t: TaskItem) => ({
                    taskId: t.id,
                    title: t.title,
                    storyPoints: t.storyPoints,
                    priorityScore: Number(t.priorityScore),
                    taskType: t.taskType,
                })),
            };
        }

        // Calculate type-specific points
        const typePointsUpdate = {
            featurePoints: task.taskType === 'FEATURE' ? pitch.featurePoints + task.storyPoints : pitch.featurePoints,
            bugPoints: task.taskType === 'BUG' ? pitch.bugPoints + task.storyPoints : pitch.bugPoints,
            debtPoints: task.taskType === 'DEBT' ? pitch.debtPoints + task.storyPoints : pitch.debtPoints,
        };

        // Check mix balance
        const targetRatio = {
            feature: pitch.organization.featureRatio,
            bug: pitch.organization.bugRatio,
            debt: pitch.organization.debtRatio,
        };

        const newTotalPoints = projectedLoad;
        const projectedRatio = {
            feature: (typePointsUpdate.featurePoints / newTotalPoints) * 100,
            bug: (typePointsUpdate.bugPoints / newTotalPoints) * 100,
            debt: (typePointsUpdate.debtPoints / newTotalPoints) * 100,
        };

        // Warn if any type exceeds target by more than 15%
        const typeKey = task.taskType.toLowerCase() as 'feature' | 'bug' | 'debt';
        const deviation = projectedRatio[typeKey] - targetRatio[typeKey];

        if (deviation > 15 && !forceAssignment) {
            return {
                success: false,
                error: 'MIX_IMBALANCE',
                mixAnalysis: {
                    currentRatio: projectedRatio,
                    targetRatio,
                    imbalance: { type: task.taskType, deviation },
                },
            };
        }

        // Proceed with assignment
        await prisma.$transaction([
            prisma.task.update({
                where: { id: taskId },
                data: { pitchId },
            }),
            prisma.productionPitch.update({
                where: { id: pitchId },
                data: {
                    currentLoad: projectedLoad,
                    ...typePointsUpdate,
                },
            }),
        ]);

        return { success: true };
    }

    /**
     * Lock a pitch to prevent further changes
     */
    async lockPitch(pitchId: string): Promise<ProductionPitch> {
        return prisma.productionPitch.update({
            where: { id: pitchId },
            data: { status: 'LOCKED' },
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // HEIJUNKA DAMPENER & SCHEDULING (The "Nervous System" Logic)
    // ═══════════════════════════════════════════════════════════════════



    /**
     * "The Pulse" - Automatically schedule tasks into a pitch using Bucket Fill allocation.
     * Enforces the 60/15/15/5/5 mix strictly, preventing "Feature Creep" from starving Debt.
     */
    async allocateSprintCapacity(
        organizationId: string,
        pitchId: string
    ): Promise<{ scheduled: number, skipped: number, buckets: any }> {
        console.log("⚖️ Starting Algorithmic Sprint Allocation...");

        const [org, pitch] = await Promise.all([
            prisma.organization.findUnique({ where: { id: organizationId } }),
            prisma.productionPitch.findUnique({ where: { id: pitchId } }),
        ]);

        if (!org || !pitch) throw errors.notFound('Organization or Pitch');

        // 1. Define Capacity Buckets (The Guardrails)
        const totalCapacity = pitch.capacityPoints;
        const bucketCaps: Record<string, { max: number, used: number }> = {
            FEATURE: { max: Math.floor(totalCapacity * (org.featureRatio / 100)), used: 0 },
            BUG: { max: Math.floor(totalCapacity * (org.bugRatio / 100)), used: 0 },
            DEBT: { max: Math.floor(totalCapacity * (org.debtRatio / 100)), used: 0 },
            // Fallback for others (Security etc)
            OTHER: { max: Math.ceil(totalCapacity * 0.05), used: 0 }
        };

        // 2. Fetch Backlog Sorted by Smoothed Priority (The "Voice of the Customer")
        const backlog = await prisma.task.findMany({
            where: {
                organizationId,
                pitchId: null,
                status: 'BACKLOG'
            },
            orderBy: { priorityScore: 'desc' }, // Highest smoothed score first
        });

        const sprintList: any[] = [];
        let skippedCount = 0;

        // 3. Bucket Fill Algorithm (The Allocator)
        for (const task of backlog) {
            const type = task.taskType as string;
            const bucketKey = (bucketCaps[type] ? type : 'OTHER') as keyof typeof bucketCaps;
            const bucket = bucketCaps[bucketKey];

            // Check: Does it fit in the bucket?
            if (bucket.used + task.storyPoints <= bucket.max) {
                // Check: Does it fit in the global pitch?
                if (pitch.currentLoad + task.storyPoints <= pitch.capacityPoints) {
                    // ✅ ALLOCATE: Fits in bucket
                    sprintList.push(task);

                    // Update Local State
                    bucket.used += task.storyPoints;
                    pitch.currentLoad += task.storyPoints;

                    console.log(`[ALLOCATED] ${task.taskType}: ${task.title} (Score: ${Number(task.priorityScore).toFixed(2)})`);
                } else {
                    console.log(`[SKIPPED] Global Overflow: ${task.title}`);
                    skippedCount++; // Global Overflow
                }
            } else {
                console.log(`[SKIPPED] ${bucketKey} Bucket Full: ${task.title}`);
                skippedCount++; // Bucket Overflow
            }
        }

        // 4. Persist the Sprint Selection (Atomic Transaction)
        if (sprintList.length > 0) {
            await prisma.$transaction(
                sprintList.map(task =>
                    prisma.task.update({
                        where: { id: task.id },
                        data: {
                            pitchId: pitchId,
                            status: 'SPRINT' as any
                        }
                    })
                )
            );

            // Update Pitch Load
            await prisma.productionPitch.update({
                where: { id: pitchId },
                data: { currentLoad: pitch.currentLoad }
            });

            console.log(`✅ Committed ${sprintList.length} items to Sprint.`);
        }

        return { scheduled: sprintList.length, skipped: skippedCount, buckets: bucketCaps };
    }

    /**
     * Complete a pitch and record velocity snapshot
     */
    async completePitch(pitchId: string): Promise<ProductionPitch> {
        const pitch = await prisma.productionPitch.findUnique({
            where: { id: pitchId },
            include: { tasks: { where: { status: 'DONE' } } },
        });

        if (!pitch) {
            throw errors.notFound('Pitch');
        }

        const completedPoints = pitch.tasks.reduce((sum: number, t: TaskItem) => sum + t.storyPoints, 0);
        const durationHours =
            (pitch.endTime.getTime() - pitch.startTime.getTime()) / (1000 * 60 * 60);

        // Record velocity snapshot
        await prisma.velocitySnapshot.create({
            data: {
                organizationId: pitch.organizationId,
                pitchId: pitch.id,
                completedPoints,
                pitchDurationHours: durationHours,
                featurePoints: pitch.featurePoints,
                bugPoints: pitch.bugPoints,
                debtPoints: pitch.debtPoints,
            },
        });

        return prisma.productionPitch.update({
            where: { id: pitchId },
            data: {
                status: 'COMPLETED',
                demandUnitsActual: completedPoints, // Simplified: 1 point = 1 demand unit
            },
        });
    }


    /**
     * Boost priority of tasks that won in Quadratic Voting
     * Links Governance (QV) to Operations (Heijunka)
     * 
     * Applies "Heijunka Dampener" (Low Pass Filter) to prevent volatility
     * Formula: NewScore = (CurrentScore * (1 - alpha)) + (VoteScore * alpha)
     */
    async optimizeBacklogPriorities(organizationId: string): Promise<void> {
        // 1. Get recent tallied QV sessions
        const sessions = await quadraticVotingService.listSessions(organizationId, 'TALLIED');
        const VOLATILITY_FACTOR = 0.2; // Alpha: Low value = high dampening (stability)

        for (const session of sessions) {
            const results = await quadraticVotingService.getSessionResults(session.id);
            // Fix: Access rankings array and cast if needed
            const rankings = (results as any).rankings || [];

            // Iterate all ranked options, not just top 3 (The Dampener handles the noise)
            for (const option of rankings) {
                // Find matching task
                const tasks = await prisma.task.findMany({
                    where: {
                        organizationId,
                        status: 'BACKLOG',
                        title: { contains: option.title }
                    }
                });

                for (const task of tasks) {
                    // Calculate Smoothed Priority
                    const currentScore = Number(task.priorityScore);
                    const voteBoost = (option.rank === 1 ? 50 : option.rank <= 3 ? 30 : 10); // Simulated "Vote Signal"

                    const newScore = this.calculateSmoothedPriority(currentScore, voteBoost, VOLATILITY_FACTOR);

                    await prisma.task.update({
                        where: { id: task.id },
                        data: { priorityScore: newScore }
                    });
                }
            }
        }
    }

    /**
     * The Heijunka Dampener (Low Pass Filter)
     * Public for testing purposes
     */
    public calculateSmoothedPriority(current: number, signal: number, alpha: number): number {
        return Math.round((current * (1 - alpha)) + (signal * alpha));
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════

    private calculateStdDev(values: number[], mean: number): number {
        if (values.length < 2) return 0;

        const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

        return Math.sqrt(avgSquaredDiff);
    }
    /**
     * Allocates capacity for a new sprint based on System Status (Peace vs Crisis)
     * "General Quarters" Logic
     */
    async dryRunAllocation(capacityPoints: number = 100): Promise<{ mix: Record<string, number>, configUsed: string }> {
        // 1. Check DEFCON Level
        const isHalted = await unitEconomicsService.isGrowthHalted();
        const config = isHalted ? CRISIS_CONFIG : STANDARD_CONFIG;

        if (isHalted) {
            console.warn("⚠️ HEIJUNKA ALERT: System is in CRISIS MODE. Switching to Retention Focus.");
        }

        // 2. Return the allocation logic (Simplified for dry run)
        return {
            mix: {
                FEATURE: Math.floor(capacityPoints * config.FEATURE),
                DEBT: Math.ceil(capacityPoints * config.DEBT), // Use ceil to ensure we fill capacity
                BUG: Math.floor(capacityPoints * config.BUG),
                SECURITY: Math.floor(capacityPoints * config.SECURITY)
            },
            configUsed: isHalted ? 'CRISIS' : 'STANDARD'
        };
    }
}

export const heijunkaService = new HeijunkaService();
