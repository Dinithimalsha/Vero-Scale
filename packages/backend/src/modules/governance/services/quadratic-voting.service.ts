import { prisma } from '../../../shared/prisma';
import { QvSession, QvOption, QvBallot, QvVote } from '@prisma/client';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════
// TYPES (Section 4.2 - The Ballot Schema)
// ═══════════════════════════════════════════════════════════════════

export interface VotingSession extends QvSession {
    options: VotingOption[];
}

export interface VotingOption extends QvOption {
    title: string;
    totalVotes: number;
    totalCost: number;
}

export interface Ballot extends QvBallot {
    votes: QvVote[];
}

export interface TallyResult {
    sessionId: string;
    rankedOptions: Array<{
        optionId: string;
        title: string;
        totalVotes: number;
        percentageOfTotal: number;
        rank: number;
    }>;
    totalVotesCast: number;
    totalCreditsSpent: number;
    participationRate: number;
}

// ═══════════════════════════════════════════════════════════════════
// QUADRATIC COST ENGINE (Section 4.1 - The Mathematics)
// ═══════════════════════════════════════════════════════════════════

export class QuadraticCostEngine {
    calculateCost(votes: number): number {
        return Math.pow(votes, 2);
    }

    maxVotesForCredits(credits: number): number {
        return Math.floor(Math.sqrt(credits));
    }

    validateBallot(
        initialCredits: number,
        votes: Array<{ voteCount: number }>
    ): { valid: boolean; totalCost: number; error?: string } {
        let totalCost = 0;

        for (const vote of votes) {
            if (vote.voteCount < 0) {
                return { valid: false, totalCost: 0, error: 'Vote count cannot be negative' };
            }
            totalCost += this.calculateCost(vote.voteCount);
        }

        if (totalCost > initialCredits) {
            return {
                valid: false,
                totalCost,
                error: `Insufficient voice credits. Cost (${totalCost}) exceeds budget (${initialCredits}).`,
            };
        }

        return { valid: true, totalCost };
    }

    calculateIntensity(voteCount: number, totalCredits: number): number {
        const maxVotes = this.maxVotesForCredits(totalCredits);
        return maxVotes > 0 ? voteCount / maxVotes : 0;
    }
}

// ═══════════════════════════════════════════════════════════════════
// QUADRATIC VOTING SERVICE (Prisma Implementation)
// ═══════════════════════════════════════════════════════════════════

export class QuadraticVotingService {
    private engine = new QuadraticCostEngine();

    async createSession(
        organizationId: string,
        title: string,
        options: Array<{ title: string; description?: string; category?: string }>,
        config: {
            description?: string;
            durationDays?: number;
            creditsPerVoter?: number;
        } = {}
    ): Promise<VotingSession> {
        const durationDays = config.durationDays || 7;
        const creditsPerVoter = config.creditsPerVoter || 1000;

        // Transactional create of session and options
        const session = await prisma.qvSession.create({
            data: {
                organizationId,
                title,
                description: config.description,
                expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
                status: 'OPEN',
                initialCreditsPerVoter: creditsPerVoter,
                options: {
                    create: options.map(opt => ({
                        title: opt.title,
                        description: opt.description,
                        category: opt.category,
                        totalVotes: 0,
                        totalCost: 0,
                    })),
                },
            },
            include: {
                options: true,
            },
        });

        // Cast to our interface which is just the Prisma types extended
        return session as unknown as VotingSession;
    }

    async submitBallot(
        sessionId: string,
        voterId: string,
        votes: Array<{ optionId: string; voteCount: number }>
    ): Promise<Ballot> {
        return prisma.$transaction(async (tx) => {
            const session = await tx.qvSession.findUnique({
                where: { id: sessionId },
            });

            if (!session) throw new Error(`Session ${sessionId} not found`);
            if (session.status !== 'OPEN') throw new Error('Voting session is not open');

            const existingBallot = await tx.qvBallot.findUnique({
                where: { sessionId_voterId: { sessionId, voterId } },
            });

            if (existingBallot) {
                throw new Error('You have already submitted a ballot for this session');
            }

            const validation = this.engine.validateBallot(
                session.initialCreditsPerVoter,
                votes
            );

            if (!validation.valid) {
                throw new Error(validation.error || 'Invalid ballot');
            }

            // Calculate costs for storage
            const enrichedVotes = votes.map(v => ({
                ...v,
                cost: this.engine.calculateCost(v.voteCount)
            }));

            const signature = this.generateBallotSignature(voterId, sessionId, enrichedVotes);

            // Create Ballot
            const ballot = await tx.qvBallot.create({
                data: {
                    sessionId,
                    voterId,
                    initialCredits: session.initialCreditsPerVoter,
                    totalCost: validation.totalCost,
                    remainingCredits: session.initialCreditsPerVoter - validation.totalCost,
                    signature,
                    votes: {
                        create: enrichedVotes.map(v => ({
                            optionId: v.optionId,
                            voteCount: v.voteCount,
                            cost: v.cost,
                        })),
                    },
                },
                include: {
                    votes: true,
                },
            });

            // Update Option Totals
            for (const v of enrichedVotes) {
                await tx.qvOption.update({
                    where: { id: v.optionId },
                    data: {
                        totalVotes: { increment: v.voteCount },
                        totalCost: { increment: v.cost },
                    },
                });
            }

            return ballot as Ballot;
        });
    }

    async getSessionResults(sessionId: string): Promise<TallyResult> {
        const session = await prisma.qvSession.findUnique({
            where: { id: sessionId },
            include: { options: true },
        });

        if (!session) throw new Error(`Session ${sessionId} not found`);

        const sortedOptions = [...session.options].sort(
            (a, b) => b.totalVotes - a.totalVotes
        );

        const totalVotesCast = sortedOptions.reduce((sum, opt) => sum + opt.totalVotes, 0);
        const totalCreditsSpent = sortedOptions.reduce((sum, opt) => sum + opt.totalCost, 0);

        const ballotCount = await prisma.qvBallot.count({
            where: { sessionId },
        });

        return {
            sessionId,
            rankedOptions: sortedOptions.map((opt, index: number) => ({
                optionId: opt.id,
                title: opt.title,
                totalVotes: opt.totalVotes,
                percentageOfTotal: totalVotesCast > 0
                    ? (opt.totalVotes / totalVotesCast) * 100
                    : 0,
                rank: index + 1,
            })),
            totalVotesCast,
            totalCreditsSpent,
            participationRate: ballotCount * 10, // Mock participation calc
        };
    }

    async closeSession(sessionId: string): Promise<TallyResult> {
        await prisma.$transaction(async (tx) => {
            const session = await tx.qvSession.findUnique({
                where: { id: sessionId },
            });

            if (!session) throw new Error(`Session ${sessionId} not found`);
            if (session.status === 'TALLIED') throw new Error('Session already closed');

            // Calculate ranks and update
            const options = await tx.qvOption.findMany({ where: { sessionId } });
            const sorted = options.sort((a, b) => b.totalVotes - a.totalVotes);

            for (let i = 0; i < sorted.length; i++) {
                await tx.qvOption.update({
                    where: { id: sorted[i].id },
                    data: { rank: i + 1 },
                });
            }

            await tx.qvSession.update({
                where: { id: sessionId },
                data: { status: 'TALLIED' },
            });
        });

        return this.getSessionResults(sessionId);
    }

    async getVoterStatus(
        sessionId: string,
        voterId: string
    ): Promise<{
        hasVoted: boolean;
        remainingCredits: number;
        ballot?: Ballot;
    }> {
        const session = await prisma.qvSession.findUnique({ where: { id: sessionId } });
        if (!session) throw new Error(`Session ${sessionId} not found`);

        const ballot = await prisma.qvBallot.findUnique({
            where: { sessionId_voterId: { sessionId, voterId } },
            include: { votes: true },
        });

        if (!ballot) {
            return {
                hasVoted: false,
                remainingCredits: session.initialCreditsPerVoter,
            };
        }

        return {
            hasVoted: true,
            remainingCredits: ballot.remainingCredits,
            ballot: ballot as Ballot,
        };
    }

    async listSessions(
        organizationId: string,
        status?: string
    ): Promise<VotingSession[]> {
        const sessions = await prisma.qvSession.findMany({
            where: {
                organizationId,
                status: status,
            },
            include: { options: true },
            orderBy: { createdAt: 'desc' },
        });

        // Use 'as unknown' to cast to extended interface if needed, or refine interface
        return sessions as unknown as VotingSession[];
    }

    previewBallotCost(
        initialCredits: number,
        votes: Array<{ voteCount: number }>
    ): {
        totalCost: number;
        remainingCredits: number;
        isValid: boolean;
        breakdown: Array<{ voteCount: number; cost: number }>;
    } {
        const breakdown = votes.map((v) => ({
            voteCount: v.voteCount,
            cost: this.engine.calculateCost(v.voteCount),
        }));

        const totalCost = breakdown.reduce((sum, item) => sum + item.cost, 0);
        const isValid = totalCost <= initialCredits && votes.every(v => v.voteCount >= 0);

        return {
            totalCost,
            remainingCredits: initialCredits - totalCost,
            isValid,
            breakdown,
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════

    private generateBallotSignature(
        voterId: string,
        sessionId: string,
        votes: Array<{ optionId: string; voteCount: number; cost: number }>
    ): string {
        const data = JSON.stringify({ voterId, sessionId, votes, timestamp: Date.now() });
        // Simple hash for demo - use proper crypto in production
        return Buffer.from(data).toString('base64').slice(0, 32);
    }
}

export const quadraticVotingService = new QuadraticVotingService();
