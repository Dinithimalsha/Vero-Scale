/**
 * Vesting Service - Equity Vesting Engine
 * Tracks stock grants, cliff dates, and 83(b) elections
 * 
 * CEO Review: Support cliff logic and acceleration triggers
 */

import { prisma } from '../../../config/database';
import { VestingGrant, VestingStatus, GrantType } from '@prisma/client';
import { errors } from '../../../shared/middleware/error-handler';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface CreateGrantInput {
    userId: string;
    organizationId: string;
    grantType?: GrantType;
    totalShares: number;
    strikePrice: number;
    grantDate: Date;
    vestingMonths?: number;
    cliffMonths?: number;
    singleTriggerAccel?: boolean;
    doubleTriggerAccel?: boolean;
    accelerationPercent?: number;
}

export interface VestingAlert {
    type: 'CLIFF_APPROACHING' | '83B_DEADLINE' | 'FULLY_VESTED';
    grantId: string;
    userId: string;
    userName: string;
    dueDate: Date;
    daysRemaining: number;
    details: string;
}

export interface VestingSnapshot {
    totalShares: number;
    vestedShares: number;
    unvestedShares: number;
    vestedPercent: number;
    nextVestDate: Date | null;
    nextVestShares: number;
    cliffPassed: boolean;
    monthsFromGrant: number;
}

// ═══════════════════════════════════════════════════════════════════
// VESTING SERVICE
// ═══════════════════════════════════════════════════════════════════

export class VestingService {
    /**
     * Create a new vesting grant for a user
     */
    async createGrant(input: CreateGrantInput): Promise<VestingGrant> {
        const vestingMonths = input.vestingMonths ?? 48;
        const cliffMonths = input.cliffMonths ?? 12;

        const grantDate = new Date(input.grantDate);
        const cliffDate = new Date(grantDate);
        cliffDate.setMonth(cliffDate.getMonth() + cliffMonths);

        const vestingEndDate = new Date(grantDate);
        vestingEndDate.setMonth(vestingEndDate.getMonth() + vestingMonths);

        // 83(b) deadline is 30 days from grant
        const election83bDeadline = new Date(grantDate);
        election83bDeadline.setDate(election83bDeadline.getDate() + 30);

        return prisma.vestingGrant.create({
            data: {
                userId: input.userId,
                organizationId: input.organizationId,
                grantType: input.grantType ?? 'ISO',
                totalShares: input.totalShares,
                strikePrice: input.strikePrice,
                grantDate,
                cliffDate,
                vestingEndDate,
                vestingMonths,
                cliffMonths,
                election83bDeadline,
                singleTriggerAccel: input.singleTriggerAccel ?? false,
                doubleTriggerAccel: input.doubleTriggerAccel ?? false,
                accelerationPercent: input.accelerationPercent,
                status: 'PENDING_START',
            },
        });
    }

    /**
     * Calculate current vesting status
     */
    async getVestingSnapshot(grantId: string): Promise<VestingSnapshot> {
        const grant = await prisma.vestingGrant.findUnique({
            where: { id: grantId },
        });

        if (!grant) {
            throw errors.notFound('Vesting Grant');
        }

        const now = new Date();
        const monthsFromGrant = this.monthsBetween(grant.grantDate, now);
        const cliffPassed = now >= grant.cliffDate;

        let vestedShares = 0;

        if (grant.status === 'FULLY_VESTED') {
            vestedShares = grant.totalShares;
        } else if (cliffPassed) {
            // Standard 4-year monthly vesting after cliff
            const sharesPerMonth = grant.totalShares / grant.vestingMonths;
            vestedShares = Math.min(
                Math.floor(monthsFromGrant * sharesPerMonth),
                grant.totalShares
            );
        }

        // Calculate next vest date
        let nextVestDate: Date | null = null;
        let nextVestShares = 0;

        if (vestedShares < grant.totalShares) {
            if (!cliffPassed) {
                nextVestDate = grant.cliffDate;
                nextVestShares = Math.floor(grant.totalShares * (grant.cliffMonths / grant.vestingMonths));
            } else {
                const sharesPerMonth = grant.totalShares / grant.vestingMonths;
                const nextMonth = Math.ceil(monthsFromGrant) + 1;
                nextVestDate = new Date(grant.grantDate);
                nextVestDate.setMonth(nextVestDate.getMonth() + nextMonth);
                nextVestShares = Math.floor(sharesPerMonth);
            }
        }

        return {
            totalShares: grant.totalShares,
            vestedShares,
            unvestedShares: grant.totalShares - vestedShares,
            vestedPercent: (vestedShares / grant.totalShares) * 100,
            nextVestDate,
            nextVestShares,
            cliffPassed,
            monthsFromGrant,
        };
    }

    /**
     * Get upcoming alerts (cliff dates, 83(b) deadlines)
     * Per CEO: 30-day advance notice for cliff approval
     */
    async getUpcomingAlerts(organizationId: string): Promise<VestingAlert[]> {
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const grants = await prisma.vestingGrant.findMany({
            where: {
                organizationId,
                status: { in: ['PENDING_START', 'ACTIVE'] },
                OR: [
                    // Cliff approaching (next 30 days)
                    {
                        cliffDate: { gte: now, lte: thirtyDaysFromNow },
                        cliffApproved: false,
                    },
                    // 83(b) deadline approaching
                    {
                        election83bDeadline: { gte: now, lte: thirtyDaysFromNow },
                        is83bFiled: false,
                    },
                ],
            },
            include: {
                user: { select: { name: true } },
            },
        });

        const alerts: VestingAlert[] = [];

        for (const grant of grants) {
            // Check cliff alert
            if (
                grant.cliffDate >= now &&
                grant.cliffDate <= thirtyDaysFromNow &&
                !grant.cliffApproved
            ) {
                const daysRemaining = Math.ceil(
                    (grant.cliffDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );

                alerts.push({
                    type: 'CLIFF_APPROACHING',
                    grantId: grant.id,
                    userId: grant.userId,
                    userName: grant.user.name,
                    dueDate: grant.cliffDate,
                    daysRemaining,
                    details: `${grant.user.name} will hit 1-year cliff in ${daysRemaining} days. Approve vesting or terminate before 25% ownership.`,
                });
            }

            // Check 83(b) alert
            if (
                grant.election83bDeadline &&
                grant.election83bDeadline >= now &&
                grant.election83bDeadline <= thirtyDaysFromNow &&
                !grant.is83bFiled
            ) {
                const daysRemaining = Math.ceil(
                    (grant.election83bDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );

                alerts.push({
                    type: '83B_DEADLINE',
                    grantId: grant.id,
                    userId: grant.userId,
                    userName: grant.user.name,
                    dueDate: grant.election83bDeadline,
                    daysRemaining,
                    details: `CRITICAL: ${grant.user.name} must file 83(b) election within ${daysRemaining} days to avoid future tax liability.`,
                });
            }
        }

        return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
    }

    /**
     * Approve cliff vesting (after performance review)
     */
    async approveCliff(
        grantId: string,
        notes?: string
    ): Promise<VestingGrant> {
        const grant = await prisma.vestingGrant.findUnique({
            where: { id: grantId },
        });

        if (!grant) {
            throw errors.notFound('Vesting Grant');
        }

        if (grant.cliffApproved) {
            throw errors.conflict('Cliff already approved');
        }

        return prisma.vestingGrant.update({
            where: { id: grantId },
            data: {
                cliffApproved: true,
                cliffApprovalDate: new Date(),
                cliffApprovalNotes: notes,
                status: 'ACTIVE',
            },
        });
    }

    /**
     * Record 83(b) election filing
     */
    async record83bElection(grantId: string): Promise<VestingGrant> {
        return prisma.vestingGrant.update({
            where: { id: grantId },
            data: {
                is83bFiled: true,
                election83bFiledAt: new Date(),
            },
        });
    }

    /**
     * Trigger acceleration (single or double trigger on acquisition)
     */
    async triggerAcceleration(
        grantId: string,
        triggerType: 'SINGLE' | 'DOUBLE'
    ): Promise<VestingGrant> {
        const grant = await prisma.vestingGrant.findUnique({
            where: { id: grantId },
        });

        if (!grant) {
            throw errors.notFound('Vesting Grant');
        }

        const canAccelerate =
            (triggerType === 'SINGLE' && grant.singleTriggerAccel) ||
            (triggerType === 'DOUBLE' && grant.doubleTriggerAccel);

        if (!canAccelerate) {
            throw errors.badRequest(`Grant does not allow ${triggerType} trigger acceleration`);
        }

        const accelerationPercent = grant.accelerationPercent ?? 100;
        const unvestedShares = grant.totalShares - grant.vestedShares;
        const acceleratedShares = Math.floor(unvestedShares * (accelerationPercent / 100));
        const newVestedShares = grant.vestedShares + acceleratedShares;

        return prisma.vestingGrant.update({
            where: { id: grantId },
            data: {
                vestedShares: newVestedShares,
                status: newVestedShares >= grant.totalShares ? 'FULLY_VESTED' : grant.status,
            },
        });
    }

    /**
     * Terminate vesting (when employee leaves)
     */
    async terminateVesting(grantId: string): Promise<VestingGrant> {
        const snapshot = await this.getVestingSnapshot(grantId);

        return prisma.vestingGrant.update({
            where: { id: grantId },
            data: {
                status: 'TERMINATED',
                vestedShares: snapshot.vestedShares,
            },
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════

    private monthsBetween(start: Date, end: Date): number {
        const months =
            (end.getFullYear() - start.getFullYear()) * 12 +
            (end.getMonth() - start.getMonth());
        return Math.max(0, months);
    }
}

export const vestingService = new VestingService();
