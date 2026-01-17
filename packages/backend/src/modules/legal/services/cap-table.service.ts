/**
 * Cap Table Service - Equity Management & Vesting
 * Complete equity lifecycle with cliff alerts and 83(b) tracking
 * 
 * CEO Review: Critical for founder/employee equity clarity
 */

import { prisma } from '../../../config/database';
import type { VestingGrant, VestingStatus, GrantType } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface CapTableEntry {
    userId: string;
    userName: string;
    grantType: GrantType;
    totalShares: number;
    vestedShares: number;
    unvestedShares: number;
    exercisedShares: number;
    vestingPercent: number;
    status: VestingStatus;
    strikePrice: number;
    currentValue: number;
    cliffDate: Date;
    cliffApproved: boolean;
    vestingEndDate: Date;
}

export interface CapTableSummary {
    totalAuthorizedShares: number;
    totalIssuedShares: number;
    totalVestedShares: number;
    totalUnvestedShares: number;
    poolRemaining: number;
    entries: CapTableEntry[];
}

export interface CliffAlert {
    grantId: string;
    userId: string;
    userName: string;
    cliffDate: Date;
    daysUntilCliff: number;
    sharesAtStake: number;
    requiresApproval: boolean;
    approvalDeadline: Date;
}

export interface Election83bAlert {
    grantId: string;
    userId: string;
    userName: string;
    grantDate: Date;
    deadline: Date;
    daysRemaining: number;
    isFiled: boolean;
    filedAt?: Date;
}

export interface CreateGrantInput {
    userId: string;
    organizationId: string;
    grantType: GrantType;
    totalShares: number;
    strikePrice: number;
    grantDate: Date;
    vestingMonths?: number;
    cliffMonths?: number;
    singleTriggerAccel?: boolean;
    doubleTriggerAccel?: boolean;
    accelerationPercent?: number;
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const CLIFF_ALERT_DAYS = 30;
const ELECTION_83B_DEADLINE_DAYS = 30;
const DEFAULT_VESTING_MONTHS = 48;
const DEFAULT_CLIFF_MONTHS = 12;
const DEFAULT_OPTION_POOL_PERCENT = 15; // 15% of total authorized

// ═══════════════════════════════════════════════════════════════════
// CAP TABLE SERVICE
// ═══════════════════════════════════════════════════════════════════

export class CapTableService {
    /**
     * Create a new equity grant
     */
    async createGrant(input: CreateGrantInput): Promise<VestingGrant> {
        const vestingMonths = input.vestingMonths ?? DEFAULT_VESTING_MONTHS;
        const cliffMonths = input.cliffMonths ?? DEFAULT_CLIFF_MONTHS;

        const grantDate = new Date(input.grantDate);
        const cliffDate = new Date(grantDate);
        cliffDate.setMonth(cliffDate.getMonth() + cliffMonths);

        const vestingEndDate = new Date(grantDate);
        vestingEndDate.setMonth(vestingEndDate.getMonth() + vestingMonths);

        // Calculate 83(b) deadline (30 days from grant)
        const election83bDeadline = new Date(grantDate);
        election83bDeadline.setDate(election83bDeadline.getDate() + ELECTION_83B_DEADLINE_DAYS);

        return prisma.vestingGrant.create({
            data: {
                userId: input.userId,
                organizationId: input.organizationId,
                grantType: input.grantType,
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
     * Calculate current vested shares based on time elapsed
     */
    calculateVestedShares(grant: VestingGrant): number {
        const now = new Date();
        const grantDate = new Date(grant.grantDate);
        const cliffDate = new Date(grant.cliffDate);
        const vestingEndDate = new Date(grant.vestingEndDate);

        // Not yet at cliff
        if (now < cliffDate) {
            return 0;
        }

        // Fully vested
        if (now >= vestingEndDate) {
            return grant.totalShares;
        }

        // Calculate proportional vesting
        const totalVestingMs = vestingEndDate.getTime() - grantDate.getTime();
        const elapsedMs = now.getTime() - grantDate.getTime();
        const vestingRatio = elapsedMs / totalVestingMs;

        return Math.floor(grant.totalShares * vestingRatio);
    }

    /**
     * Update vested shares for a grant
     */
    async updateVestedShares(grantId: string): Promise<VestingGrant> {
        const grant = await prisma.vestingGrant.findUnique({
            where: { id: grantId },
        });

        if (!grant) {
            throw new Error('Grant not found');
        }

        const vestedShares = this.calculateVestedShares(grant);
        const now = new Date();

        // Determine status
        let status: VestingStatus = grant.status;
        if (vestedShares >= grant.totalShares) {
            status = 'FULLY_VESTED';
        } else if (now >= new Date(grant.cliffDate) && grant.cliffApproved) {
            status = 'ACTIVE';
        }

        return prisma.vestingGrant.update({
            where: { id: grantId },
            data: { vestedShares, status },
        });
    }

    /**
     * Approve cliff for a grant
     * Per CEO: Critical decision point before 25% ownership transfers
     */
    async approveCliff(
        grantId: string,
        approvalNotes?: string
    ): Promise<VestingGrant> {
        return prisma.vestingGrant.update({
            where: { id: grantId },
            data: {
                cliffApproved: true,
                cliffApprovalDate: new Date(),
                cliffApprovalNotes: approvalNotes,
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
     * Get upcoming cliff alerts (within 30 days)
     * Per CEO: 30-day notice system
     */
    async getCliffAlerts(organizationId: string): Promise<CliffAlert[]> {
        const now = new Date();
        const alertWindow = new Date();
        alertWindow.setDate(alertWindow.getDate() + CLIFF_ALERT_DAYS);

        const grants = await prisma.vestingGrant.findMany({
            where: {
                organizationId,
                cliffApproved: false,
                cliffDate: { gte: now, lte: alertWindow },
                status: { in: ['PENDING_START', 'ACTIVE'] },
            },
            include: {
                user: { select: { id: true, name: true } },
            },
        });

        return grants.map(grant => {
            const cliffDate = new Date(grant.cliffDate);
            const daysUntilCliff = Math.ceil(
                (cliffDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Cliff shares = 25% of total (standard 4-year vest with 1-year cliff)
            const sharesAtStake = Math.floor(grant.totalShares * (grant.cliffMonths / grant.vestingMonths));

            // Approval deadline = 7 days before cliff
            const approvalDeadline = new Date(cliffDate);
            approvalDeadline.setDate(approvalDeadline.getDate() - 7);

            return {
                grantId: grant.id,
                userId: grant.userId,
                userName: grant.user.name,
                cliffDate,
                daysUntilCliff,
                sharesAtStake,
                requiresApproval: true,
                approvalDeadline,
            };
        });
    }

    /**
     * Get 83(b) election alerts (unfiled within deadline)
     */
    async get83bAlerts(organizationId: string): Promise<Election83bAlert[]> {
        const now = new Date();

        const grants = await prisma.vestingGrant.findMany({
            where: {
                organizationId,
                is83bFiled: false,
                election83bDeadline: { gte: now },
                grantType: { in: ['RSA', 'ISO'] }, // Only applicable to these types
            },
            include: {
                user: { select: { id: true, name: true } },
            },
        });

        return grants.map(grant => {
            const deadline = grant.election83bDeadline!;
            const daysRemaining = Math.ceil(
                (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            return {
                grantId: grant.id,
                userId: grant.userId,
                userName: grant.user.name,
                grantDate: grant.grantDate,
                deadline,
                daysRemaining,
                isFiled: grant.is83bFiled,
                filedAt: grant.election83bFiledAt ?? undefined,
            };
        });
    }

    /**
     * Trigger acceleration (single or double trigger)
     * Per CEO: Support for M&A and termination scenarios
     */
    async triggerAcceleration(
        grantId: string,
        triggerType: 'SINGLE' | 'DOUBLE'
    ): Promise<VestingGrant> {
        const grant = await prisma.vestingGrant.findUnique({
            where: { id: grantId },
        });

        if (!grant) {
            throw new Error('Grant not found');
        }

        // Check if grant has this acceleration type
        if (triggerType === 'SINGLE' && !grant.singleTriggerAccel) {
            throw new Error('Grant does not have single-trigger acceleration');
        }
        if (triggerType === 'DOUBLE' && !grant.doubleTriggerAccel) {
            throw new Error('Grant does not have double-trigger acceleration');
        }

        // Calculate accelerated shares
        const accelerationPercent = grant.accelerationPercent ?? 100;
        const unvestedShares = grant.totalShares - grant.vestedShares;
        const acceleratedShares = Math.floor(unvestedShares * (accelerationPercent / 100));
        const newVestedShares = grant.vestedShares + acceleratedShares;

        return prisma.vestingGrant.update({
            where: { id: grantId },
            data: {
                vestedShares: newVestedShares,
                status: newVestedShares >= grant.totalShares ? 'FULLY_VESTED' : 'ACTIVE',
            },
        });
    }

    /**
     * Terminate a grant (employee departure)
     */
    async terminateGrant(
        grantId: string,
        terminationDate: Date
    ): Promise<VestingGrant> {
        const grant = await prisma.vestingGrant.findUnique({
            where: { id: grantId },
        });

        if (!grant) {
            throw new Error('Grant not found');
        }

        // Calculate vested shares as of termination
        const vestedAsOfTermination = this.calculateVestedShares({
            ...grant,
            vestingEndDate: terminationDate,
        } as VestingGrant);

        return prisma.vestingGrant.update({
            where: { id: grantId },
            data: {
                vestedShares: vestedAsOfTermination,
                status: 'TERMINATED',
            },
        });
    }

    /**
     * Get full cap table for organization
     */
    async getCapTable(
        organizationId: string,
        currentSharePrice: number = 1
    ): Promise<CapTableSummary> {
        const grants = await prisma.vestingGrant.findMany({
            where: { organizationId },
            include: {
                user: { select: { id: true, name: true } },
            },
        });

        // Update vested shares for all grants
        const updatedGrants = await Promise.all(
            grants.map(async grant => {
                await this.updateVestedShares(grant.id);
                return prisma.vestingGrant.findUnique({
                    where: { id: grant.id },
                    include: { user: { select: { id: true, name: true } } },
                });
            })
        );

        const entries: CapTableEntry[] = updatedGrants
            .filter((g): g is NonNullable<typeof g> => g !== null)
            .map(grant => ({
                userId: grant.userId,
                userName: grant.user.name,
                grantType: grant.grantType,
                totalShares: grant.totalShares,
                vestedShares: grant.vestedShares,
                unvestedShares: grant.totalShares - grant.vestedShares,
                exercisedShares: grant.exercisedShares,
                vestingPercent: Math.round((grant.vestedShares / grant.totalShares) * 100),
                status: grant.status,
                strikePrice: Number(grant.strikePrice),
                currentValue: (grant.vestedShares - grant.exercisedShares) * (currentSharePrice - Number(grant.strikePrice)),
                cliffDate: grant.cliffDate,
                cliffApproved: grant.cliffApproved,
                vestingEndDate: grant.vestingEndDate,
            }));

        const totalIssuedShares = entries.reduce((sum, e) => sum + e.totalShares, 0);
        const totalVestedShares = entries.reduce((sum, e) => sum + e.vestedShares, 0);
        const totalUnvestedShares = entries.reduce((sum, e) => sum + e.unvestedShares, 0);

        // Assume total authorized is issued + 15% pool
        const totalAuthorizedShares = Math.ceil(totalIssuedShares / (1 - DEFAULT_OPTION_POOL_PERCENT / 100));
        const poolRemaining = totalAuthorizedShares - totalIssuedShares;

        return {
            totalAuthorizedShares,
            totalIssuedShares,
            totalVestedShares,
            totalUnvestedShares,
            poolRemaining,
            entries,
        };
    }
}

export const capTableService = new CapTableService();
