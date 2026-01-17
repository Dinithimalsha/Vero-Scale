/**
 * Muda Service - 7 Wastes Detection & Visualization
 * Implements Toyota's waste identification for software development
 * 
 * CEO Review Incorporated:
 * - "Stale flag" threshold (>30 days) for overproduction detection
 * - Waiting time tracking for PR idle time
 * - WIP inventory valuation
 */

import { prisma } from '../../../config/database';
import type { Task, TaskStatus } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface WaitingTimeMetrics {
    averageWaitHours: number;
    totalWaitHours: number;
    taskCount: number;
    byStage: {
        backlogToReady: number;
        readyToInProgress: number;
        inProgressToReview: number;
        reviewToDone: number;
    };
    longestWaitingTasks: Array<{
        id: string;
        title: string;
        waitingHours: number;
        currentStatus: TaskStatus;
    }>;
}

export interface WipInventoryValuation {
    totalWipValue: number;
    taskCount: number;
    byType: {
        feature: { count: number; value: number };
        bug: { count: number; value: number };
        debt: { count: number; value: number };
    };
    averageAge: number;
    oldestItems: Array<{
        id: string;
        title: string;
        ageDays: number;
        estimatedValue: number;
    }>;
}

export interface ContextSwitchingMetrics {
    averageSwitchesPerDay: number;
    assigneeMetrics: Array<{
        userId: string;
        userName: string;
        activeTasks: number;
        switchesLastWeek: number;
        focusScore: number; // 0-100, higher is better
    }>;
    recommendations: string[];
}

export interface OverproductionMetrics {
    staleFlagCount: number;
    unusedFeatureCount: number;
    totalStaleFlags: Array<{
        id: string;
        flagKey: string;
        flagName: string;
        daysSinceDeployment: number;
        adoptionPercent: number;
    }>;
    potentialWastedEffort: number; // Story points
}

export interface MudaOverview {
    waitingTime: WaitingTimeMetrics;
    wipInventory: WipInventoryValuation;
    contextSwitching: ContextSwitchingMetrics;
    overproduction: OverproductionMetrics;
    totalWasteScore: number; // 0-100, lower is better
    recommendations: string[];
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const STALE_FLAG_THRESHOLD_DAYS = 30;
const LOW_ADOPTION_THRESHOLD_PERCENT = 5;
const DEFAULT_HOURLY_RATE = 75; // USD per hour for valuation
const MAX_HEALTHY_WIP_PER_PERSON = 3;

// ═══════════════════════════════════════════════════════════════════
// MUDA SERVICE
// ═══════════════════════════════════════════════════════════════════

export class MudaService {
    /**
     * Calculate waiting time (Muda of Waiting)
     * Tracks time tasks spend idle between stages
     */
    async calculateWaitingTime(organizationId: string): Promise<WaitingTimeMetrics> {
        const tasks = await prisma.task.findMany({
            where: { organizationId },
            select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
                startedAt: true,
                inReviewAt: true,
                completedAt: true,
                totalIdleMinutes: true,
            },
        });

        let totalWaitMinutes = 0;
        let taskCount = 0;
        const byStage = {
            backlogToReady: 0,
            readyToInProgress: 0,
            inProgressToReview: 0,
            reviewToDone: 0,
        };

        const longestWaiting: Array<{
            id: string;
            title: string;
            waitingHours: number;
            currentStatus: TaskStatus;
        }> = [];

        for (const task of tasks) {
            const idleMinutes = task.totalIdleMinutes ?? 0;
            if (idleMinutes > 0) {
                totalWaitMinutes += idleMinutes;
                taskCount++;

                longestWaiting.push({
                    id: task.id,
                    title: task.title,
                    waitingHours: Math.round(idleMinutes / 60),
                    currentStatus: task.status,
                });
            }

            // Calculate stage-specific waiting
            if (task.startedAt && task.createdAt) {
                const waitMs = task.startedAt.getTime() - task.createdAt.getTime();
                byStage.backlogToReady += waitMs / (1000 * 60 * 60);
            }
            if (task.inReviewAt && task.startedAt) {
                const waitMs = task.inReviewAt.getTime() - task.startedAt.getTime();
                byStage.inProgressToReview += waitMs / (1000 * 60 * 60);
            }
            if (task.completedAt && task.inReviewAt) {
                const waitMs = task.completedAt.getTime() - task.inReviewAt.getTime();
                byStage.reviewToDone += waitMs / (1000 * 60 * 60);
            }
        }

        // Sort and take top 5 longest waiting
        longestWaiting.sort((a, b) => b.waitingHours - a.waitingHours);

        return {
            averageWaitHours: taskCount > 0 ? Math.round(totalWaitMinutes / 60 / taskCount) : 0,
            totalWaitHours: Math.round(totalWaitMinutes / 60),
            taskCount,
            byStage: {
                backlogToReady: Math.round(byStage.backlogToReady),
                readyToInProgress: Math.round(byStage.readyToInProgress),
                inProgressToReview: Math.round(byStage.inProgressToReview),
                reviewToDone: Math.round(byStage.reviewToDone),
            },
            longestWaitingTasks: longestWaiting.slice(0, 5),
        };
    }

    /**
     * Calculate WIP Inventory Valuation (Muda of Inventory)
     * WIP = partially completed work = trapped capital
     */
    async calculateWipInventory(organizationId: string): Promise<WipInventoryValuation> {
        const wipStatuses: TaskStatus[] = ['READY', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED'];

        const wipTasks = await prisma.task.findMany({
            where: {
                organizationId,
                status: { in: wipStatuses },
            },
            select: {
                id: true,
                title: true,
                taskType: true,
                storyPoints: true,
                estimatedHours: true,
                hourlyRate: true,
                createdAt: true,
            },
        });

        const now = new Date();
        let totalValue = 0;
        let totalAgeDays = 0;

        const byType = {
            feature: { count: 0, value: 0 },
            bug: { count: 0, value: 0 },
            debt: { count: 0, value: 0 },
        };

        const oldestItems: Array<{
            id: string;
            title: string;
            ageDays: number;
            estimatedValue: number;
        }> = [];

        for (const task of wipTasks) {
            const ageDays = Math.floor((now.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            totalAgeDays += ageDays;

            // Calculate value: estimatedHours * hourlyRate, or fallback
            const hours = task.estimatedHours ?? task.storyPoints * 4; // Assume 4h per point if not specified
            const rate = task.hourlyRate ? Number(task.hourlyRate) : DEFAULT_HOURLY_RATE;
            const value = hours * rate;
            totalValue += value;

            // Track by type
            const typeKey = task.taskType.toLowerCase() as 'feature' | 'bug' | 'debt';
            byType[typeKey].count++;
            byType[typeKey].value += value;

            oldestItems.push({
                id: task.id,
                title: task.title,
                ageDays,
                estimatedValue: Math.round(value),
            });
        }

        // Sort by age descending
        oldestItems.sort((a, b) => b.ageDays - a.ageDays);

        return {
            totalWipValue: Math.round(totalValue),
            taskCount: wipTasks.length,
            byType: {
                feature: {
                    count: byType.feature.count,
                    value: Math.round(byType.feature.value),
                },
                bug: {
                    count: byType.bug.count,
                    value: Math.round(byType.bug.value),
                },
                debt: {
                    count: byType.debt.count,
                    value: Math.round(byType.debt.value),
                },
            },
            averageAge: wipTasks.length > 0 ? Math.round(totalAgeDays / wipTasks.length) : 0,
            oldestItems: oldestItems.slice(0, 5),
        };
    }

    /**
     * Calculate Context Switching metrics (Muda of Motion)
     * Multitasking = cognitive overhead = waste
     */
    async calculateContextSwitching(organizationId: string): Promise<ContextSwitchingMetrics> {
        // Get all active tasks grouped by assignee
        const activeTasks = await prisma.task.groupBy({
            by: ['assigneeId'],
            where: {
                organizationId,
                status: { in: ['IN_PROGRESS', 'BLOCKED'] },
                assigneeId: { not: null },
            },
            _count: { id: true },
        });

        const assigneeIds = activeTasks
            .map(t => t.assigneeId)
            .filter((id): id is string => id !== null);

        const users = await prisma.user.findMany({
            where: { id: { in: assigneeIds } },
            select: { id: true, name: true },
        });

        const userMap = new Map(users.map(u => [u.id, u.name]));

        const assigneeMetrics = activeTasks.map(task => {
            const activeCnt = task._count.id;
            const focusScore = Math.max(0, 100 - (activeCnt - 1) * 25); // Lose 25 points per extra task

            return {
                userId: task.assigneeId!,
                userName: userMap.get(task.assigneeId!) ?? 'Unknown',
                activeTasks: activeCnt,
                switchesLastWeek: activeCnt * 3, // Estimate: 3 switches per active task per week
                focusScore: Math.min(100, focusScore),
            };
        });

        // Generate recommendations
        const recommendations: string[] = [];
        const overloadedUsers = assigneeMetrics.filter(m => m.activeTasks > MAX_HEALTHY_WIP_PER_PERSON);

        if (overloadedUsers.length > 0) {
            recommendations.push(
                `${overloadedUsers.length} team member(s) have more than ${MAX_HEALTHY_WIP_PER_PERSON} active tasks. Consider reducing WIP limits.`
            );
        }

        const lowFocusUsers = assigneeMetrics.filter(m => m.focusScore < 50);
        if (lowFocusUsers.length > 0) {
            recommendations.push(
                `${lowFocusUsers.length} team member(s) have focus scores below 50%. Prioritize completing existing work.`
            );
        }

        const avgSwitches = assigneeMetrics.length > 0
            ? assigneeMetrics.reduce((sum, m) => sum + m.switchesLastWeek, 0) / assigneeMetrics.length / 7
            : 0;

        return {
            averageSwitchesPerDay: Math.round(avgSwitches * 10) / 10,
            assigneeMetrics,
            recommendations,
        };
    }

    /**
     * Detect Overproduction (Muda of Overproduction)
     * Features shipped but never used = wasted effort
     * Per CEO: Use "stale flag" threshold (>30 days with <5% adoption)
     */
    async detectOverproduction(organizationId: string): Promise<OverproductionMetrics> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - STALE_FLAG_THRESHOLD_DAYS);

        // Find stale feature flags
        const staleFlags = await prisma.featureFlag.findMany({
            where: {
                organizationId,
                deployedAt: { lte: thirtyDaysAgo },
                OR: [
                    { adoptionPercent: { lt: LOW_ADOPTION_THRESHOLD_PERCENT } },
                    { adoptionPercent: null },
                ],
            },
            select: {
                id: true,
                flagKey: true,
                flagName: true,
                deployedAt: true,
                adoptionPercent: true,
            },
        });

        const now = new Date();
        const totalStaleFlags = staleFlags.map(flag => ({
            id: flag.id,
            flagKey: flag.flagKey,
            flagName: flag.flagName,
            daysSinceDeployment: flag.deployedAt
                ? Math.floor((now.getTime() - flag.deployedAt.getTime()) / (1000 * 60 * 60 * 24))
                : 0,
            adoptionPercent: flag.adoptionPercent ?? 0,
        }));

        // Mark flags as stale in database
        await prisma.featureFlag.updateMany({
            where: {
                id: { in: staleFlags.map(f => f.id) },
            },
            data: { isStale: true },
        });

        // Estimate wasted story points (assumes ~8 points per feature flag average)
        const potentialWastedEffort = staleFlags.length * 8;

        // Also count FEATURE tasks that were completed but associated with stale flags
        // (This would require linking tasks to feature flags - simplified here)

        return {
            staleFlagCount: staleFlags.length,
            unusedFeatureCount: staleFlags.length,
            totalStaleFlags,
            potentialWastedEffort,
        };
    }

    /**
     * Get comprehensive Muda overview
     */
    async getMudaOverview(organizationId: string): Promise<MudaOverview> {
        const [waitingTime, wipInventory, contextSwitching, overproduction] = await Promise.all([
            this.calculateWaitingTime(organizationId),
            this.calculateWipInventory(organizationId),
            this.calculateContextSwitching(organizationId),
            this.detectOverproduction(organizationId),
        ]);

        // Calculate total waste score (0-100, lower is better)
        // Weight each category
        const waitingScore = Math.min(100, waitingTime.averageWaitHours * 2);
        const wipScore = Math.min(100, wipInventory.averageAge * 2);
        const switchingScore = Math.min(100, contextSwitching.averageSwitchesPerDay * 20);
        const overproductionScore = Math.min(100, overproduction.staleFlagCount * 10);

        const totalWasteScore = Math.round(
            (waitingScore * 0.25 + wipScore * 0.25 + switchingScore * 0.25 + overproductionScore * 0.25)
        );

        // Generate top recommendations
        const recommendations: string[] = [];

        if (waitingTime.averageWaitHours > 24) {
            recommendations.push('High waiting time detected. Review PR queue and approval bottlenecks.');
        }

        if (wipInventory.averageAge > 14) {
            recommendations.push('WIP items are aging. Focus on completing in-flight work before starting new tasks.');
        }

        if (contextSwitching.averageSwitchesPerDay > 5) {
            recommendations.push('Context switching is high. Implement stricter WIP limits per person.');
        }

        if (overproduction.staleFlagCount > 3) {
            recommendations.push(`${overproduction.staleFlagCount} stale feature flags detected. Consider removing unused features.`);
        }

        return {
            waitingTime,
            wipInventory,
            contextSwitching,
            overproduction,
            totalWasteScore,
            recommendations: recommendations.slice(0, 5),
        };
    }

    /**
     * Track when a task becomes idle (starts waiting)
     */
    async startIdleTracking(taskId: string): Promise<void> {
        await prisma.task.update({
            where: { id: taskId },
            data: { lastIdleStart: new Date() },
        });
    }

    /**
     * Stop idle tracking and accumulate idle time
     */
    async stopIdleTracking(taskId: string): Promise<void> {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: { lastIdleStart: true, totalIdleMinutes: true },
        });

        if (task?.lastIdleStart) {
            const idleMinutes = Math.floor(
                (Date.now() - task.lastIdleStart.getTime()) / (1000 * 60)
            );

            await prisma.task.update({
                where: { id: taskId },
                data: {
                    lastIdleStart: null,
                    totalIdleMinutes: (task.totalIdleMinutes ?? 0) + idleMinutes,
                },
            });
        }
    }
}

export const mudaService = new MudaService();
