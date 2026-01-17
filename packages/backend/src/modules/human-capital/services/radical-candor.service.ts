/**
 * Radical Candor Feedback Service
 * Private feedback coaching with NLP analysis
 * 
 * Per CEO: Private "mirror" for self-reflection, NOT surveillance
 * Care personally + Challenge directly = Radical Candor
 */

import { prisma } from '../../../config/database';
import type { FeedbackEntry, FeedbackType, CandorQuadrant } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface CreateFeedbackInput {
    organizationId: string;
    giverId: string;
    recipientId: string;
    content: string;
    feedbackType: FeedbackType;
    isDraft?: boolean;
}

export interface SentimentAnalysis {
    careScore: number;        // 0-1: How much caring/empathy is shown
    challengeScore: number;   // 0-1: How direct/challenging the feedback is
    quadrant: CandorQuadrant;
    toneSuggestion?: string;
}

export interface FeedbackHealthMetrics {
    totalCount: number;
    praiseCount: number;
    constructiveCount: number;
    praiseRatio: number;
    quadrantDistribution: Record<CandorQuadrant, number>;
    avgCareScore: number;
    avgChallengeScore: number;
}

export interface PersonalFeedbackStats {
    given: number;
    received: number;
    avgCareScore: number;
    avgChallengeScore: number;
    dominantQuadrant: CandorQuadrant;
    recommendations: string[];
}

// ═══════════════════════════════════════════════════════════════════
// NLP PATTERNS FOR SENTIMENT ANALYSIS
// Per CEO: Coach, don't surveil
// ═══════════════════════════════════════════════════════════════════

const CARE_INDICATORS = {
    high: [
        /I appreciate/i, /I understand/i, /I care about/i, /I want to help/i,
        /I believe in you/i, /I'm here for you/i, /I support/i,
        /your wellbeing/i, /how are you feeling/i, /I noticed you seemed/i,
        /I'm concerned/i, /I value you/i, /thank you for/i,
    ],
    medium: [
        /I think/i, /I noticed/i, /I've seen/i, /consider/i,
        /let me know/i, /I wanted to share/i, /for your benefit/i,
    ],
    low: [
        /you need to/i, /you should have/i, /why didn't you/i,
        /you failed/i, /that was wrong/i, /unacceptable/i,
    ],
};

const CHALLENGE_INDICATORS = {
    high: [
        /you need to improve/i, /I have concerns about/i, /let me be direct/i,
        /the truth is/i, /I expect/i, /this isn't working/i,
        /we need to talk about/i, /this is a problem/i,
        /you missed/i, /the deadline/i, /below expectations/i,
    ],
    medium: [
        /I'd suggest/i, /have you considered/i, /might want to/i,
        /could be better/i, /room for improvement/i, /next time/i,
    ],
    low: [
        /no worries/i, /it's fine/i, /don't worry about it/i,
        /it's okay/i, /these things happen/i, /not a big deal/i,
    ],
};

const QUADRANT_RECOMMENDATIONS: Record<CandorQuadrant, string[]> = {
    RADICAL_CANDOR: [
        'Great balance of care and directness. Keep it up!',
        'Your feedback shows both empathy and clarity.',
    ],
    RUINOUS_EMPATHY: [
        'Consider being more direct about what needs to change.',
        'Your care is evident, but the recipient may not understand what to improve.',
        'Try adding specific, actionable feedback.',
    ],
    OBNOXIOUS_AGGRESSION: [
        'Try adding more context about why this matters to you.',
        'Consider acknowledging the person\'s efforts before the critique.',
        'Leading with empathy can make your feedback more effective.',
    ],
    MANIPULATIVE_INSINCERITY: [
        'Be more specific about both care and expectations.',
        'Vague feedback doesn\'t help growth. What specifically do you want to change?',
        'Consider whether this feedback is truly helpful.',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// RADICAL CANDOR SERVICE
// ═══════════════════════════════════════════════════════════════════

export class RadicalCandorService {
    /**
     * Create feedback entry with NLP analysis
     */
    async createFeedback(input: CreateFeedbackInput): Promise<FeedbackEntry> {
        // Analyze sentiment when not a draft
        let analysis: SentimentAnalysis | null = null;
        if (!input.isDraft) {
            analysis = this.analyzeSentiment(input.content);
        }

        return prisma.feedbackEntry.create({
            data: {
                organizationId: input.organizationId,
                giverId: input.giverId,
                recipientId: input.recipientId,
                content: input.content,
                feedbackType: input.feedbackType,
                isDraft: input.isDraft ?? true,
                careScore: analysis?.careScore,
                challengeScore: analysis?.challengeScore,
                candorQuadrant: analysis?.quadrant,
                toneSuggestion: analysis?.toneSuggestion,
                contributesToOrgStats: !input.isDraft,
            },
        });
    }

    /**
     * Analyze sentiment of feedback content
     * Per CEO: Private mirror for giver, not surveillance
     */
    analyzeSentiment(content: string): SentimentAnalysis {
        // Calculate care score
        let carePoints = 0;
        for (const pattern of CARE_INDICATORS.high) {
            if (pattern.test(content)) carePoints += 3;
        }
        for (const pattern of CARE_INDICATORS.medium) {
            if (pattern.test(content)) carePoints += 2;
        }
        for (const pattern of CARE_INDICATORS.low) {
            if (pattern.test(content)) carePoints -= 1;
        }
        const careScore = Math.max(0, Math.min(1, carePoints / 10));

        // Calculate challenge score
        let challengePoints = 0;
        for (const pattern of CHALLENGE_INDICATORS.high) {
            if (pattern.test(content)) challengePoints += 3;
        }
        for (const pattern of CHALLENGE_INDICATORS.medium) {
            if (pattern.test(content)) challengePoints += 2;
        }
        for (const pattern of CHALLENGE_INDICATORS.low) {
            if (pattern.test(content)) challengePoints -= 1;
        }
        const challengeScore = Math.max(0, Math.min(1, challengePoints / 10));

        // Determine quadrant
        let quadrant: CandorQuadrant;
        if (careScore >= 0.5 && challengeScore >= 0.5) {
            quadrant = 'RADICAL_CANDOR';
        } else if (careScore >= 0.5 && challengeScore < 0.5) {
            quadrant = 'RUINOUS_EMPATHY';
        } else if (careScore < 0.5 && challengeScore >= 0.5) {
            quadrant = 'OBNOXIOUS_AGGRESSION';
        } else {
            quadrant = 'MANIPULATIVE_INSINCERITY';
        }

        // Generate tone suggestion if not in ideal quadrant
        let toneSuggestion: string | undefined;
        if (quadrant !== 'RADICAL_CANDOR') {
            const suggestions = QUADRANT_RECOMMENDATIONS[quadrant];
            toneSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        }

        return { careScore, challengeScore, quadrant, toneSuggestion };
    }

    /**
     * Update/send feedback (analyze when sending)
     */
    async sendFeedback(feedbackId: string): Promise<FeedbackEntry> {
        const feedback = await prisma.feedbackEntry.findUnique({
            where: { id: feedbackId },
        });

        if (!feedback) {
            throw new Error('Feedback not found');
        }

        const analysis = this.analyzeSentiment(feedback.content);

        return prisma.feedbackEntry.update({
            where: { id: feedbackId },
            data: {
                isDraft: false,
                careScore: analysis.careScore,
                challengeScore: analysis.challengeScore,
                candorQuadrant: analysis.quadrant,
                toneSuggestion: analysis.toneSuggestion,
                contributesToOrgStats: true,
            },
        });
    }

    /**
     * Get feedback given by a user (private to giver)
     */
    async getGivenFeedback(giverId: string): Promise<FeedbackEntry[]> {
        return prisma.feedbackEntry.findMany({
            where: { giverId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get received feedback (only content, not analysis)
     */
    async getReceivedFeedback(recipientId: string): Promise<Array<Omit<FeedbackEntry, 'careScore' | 'challengeScore' | 'candorQuadrant' | 'toneSuggestion'>>> {
        const feedback = await prisma.feedbackEntry.findMany({
            where: { recipientId, isDraft: false },
            orderBy: { createdAt: 'desc' },
        });

        // Strip private analysis fields (these are only for the giver)
        return feedback.map(f => ({
            ...f,
            careScore: null,
            challengeScore: null,
            candorQuadrant: null,
            toneSuggestion: null,
        }));
    }

    /**
     * Get personal feedback stats (private to user)
     */
    async getPersonalStats(userId: string): Promise<PersonalFeedbackStats> {
        const given = await prisma.feedbackEntry.findMany({
            where: { giverId: userId, isDraft: false },
        });

        const received = await prisma.feedbackEntry.count({
            where: { recipientId: userId, isDraft: false },
        });

        // Calculate averages
        let totalCare = 0;
        let totalChallenge = 0;
        const quadrantCounts: Record<CandorQuadrant, number> = {
            RADICAL_CANDOR: 0,
            RUINOUS_EMPATHY: 0,
            OBNOXIOUS_AGGRESSION: 0,
            MANIPULATIVE_INSINCERITY: 0,
        };

        for (const f of given) {
            if (f.careScore) totalCare += Number(f.careScore);
            if (f.challengeScore) totalChallenge += Number(f.challengeScore);
            if (f.candorQuadrant) quadrantCounts[f.candorQuadrant]++;
        }

        const avgCareScore = given.length > 0 ? totalCare / given.length : 0;
        const avgChallengeScore = given.length > 0 ? totalChallenge / given.length : 0;

        // Find dominant quadrant
        const dominantQuadrant = (Object.entries(quadrantCounts) as [CandorQuadrant, number][])
            .sort((a, b) => b[1] - a[1])[0][0];

        // Generate recommendations
        const recommendations = QUADRANT_RECOMMENDATIONS[dominantQuadrant].slice(0, 2);

        return {
            given: given.length,
            received,
            avgCareScore: Math.round(avgCareScore * 100) / 100,
            avgChallengeScore: Math.round(avgChallengeScore * 100) / 100,
            dominantQuadrant,
            recommendations,
        };
    }

    /**
     * Get organization-level health metrics (anonymized)
     * Per CEO: Aggregate only, no individual data
     */
    async getOrgHealthMetrics(organizationId: string): Promise<FeedbackHealthMetrics> {
        const feedback = await prisma.feedbackEntry.findMany({
            where: { organizationId, contributesToOrgStats: true },
        });

        const quadrantDistribution: Record<CandorQuadrant, number> = {
            RADICAL_CANDOR: 0,
            RUINOUS_EMPATHY: 0,
            OBNOXIOUS_AGGRESSION: 0,
            MANIPULATIVE_INSINCERITY: 0,
        };

        let totalCare = 0;
        let totalChallenge = 0;
        let praiseCount = 0;
        let constructiveCount = 0;

        for (const f of feedback) {
            if (f.candorQuadrant) quadrantDistribution[f.candorQuadrant]++;
            if (f.careScore) totalCare += Number(f.careScore);
            if (f.challengeScore) totalChallenge += Number(f.challengeScore);
            if (f.feedbackType === 'PRAISE') praiseCount++;
            if (f.feedbackType === 'CONSTRUCTIVE') constructiveCount++;
        }

        return {
            totalCount: feedback.length,
            praiseCount,
            constructiveCount,
            praiseRatio: feedback.length > 0 ? praiseCount / feedback.length : 0,
            quadrantDistribution,
            avgCareScore: feedback.length > 0 ? Math.round((totalCare / feedback.length) * 100) / 100 : 0,
            avgChallengeScore: feedback.length > 0 ? Math.round((totalChallenge / feedback.length) * 100) / 100 : 0,
        };
    }

    /**
     * Get 2x2 Candor Matrix data for visualization
     */
    getCandorMatrixData(stats: FeedbackHealthMetrics): {
        quadrants: Array<{
            name: string;
            x: number;
            y: number;
            count: number;
            description: string;
        }>;
    } {
        return {
            quadrants: [
                {
                    name: 'Radical Candor',
                    x: 1,
                    y: 1,
                    count: stats.quadrantDistribution.RADICAL_CANDOR,
                    description: 'Care Personally + Challenge Directly ✓',
                },
                {
                    name: 'Ruinous Empathy',
                    x: 1,
                    y: 0,
                    count: stats.quadrantDistribution.RUINOUS_EMPATHY,
                    description: 'Care without Challenge',
                },
                {
                    name: 'Obnoxious Aggression',
                    x: 0,
                    y: 1,
                    count: stats.quadrantDistribution.OBNOXIOUS_AGGRESSION,
                    description: 'Challenge without Care',
                },
                {
                    name: 'Manipulative Insincerity',
                    x: 0,
                    y: 0,
                    count: stats.quadrantDistribution.MANIPULATIVE_INSINCERITY,
                    description: 'Neither Care nor Challenge',
                },
            ],
        };
    }

    /**
     * Store monthly org-level metrics (anonymized)
     */
    async storeMonthlyMetrics(organizationId: string): Promise<void> {
        const metrics = await this.getOrgHealthMetrics(organizationId);
        const period = new Date();
        period.setDate(1); // First of month

        await prisma.feedbackHealthMetrics.upsert({
            where: {
                organizationId_period: { organizationId, period },
            },
            update: {
                totalFeedbackCount: metrics.totalCount,
                praiseCount: metrics.praiseCount,
                constructiveCount: metrics.constructiveCount,
                radicalCandorPercent: metrics.quadrantDistribution.RADICAL_CANDOR / Math.max(1, metrics.totalCount) * 100,
                ruinousEmpathyPercent: metrics.quadrantDistribution.RUINOUS_EMPATHY / Math.max(1, metrics.totalCount) * 100,
                aggressionPercent: metrics.quadrantDistribution.OBNOXIOUS_AGGRESSION / Math.max(1, metrics.totalCount) * 100,
            },
            create: {
                organizationId,
                period,
                totalFeedbackCount: metrics.totalCount,
                praiseCount: metrics.praiseCount,
                constructiveCount: metrics.constructiveCount,
                radicalCandorPercent: metrics.quadrantDistribution.RADICAL_CANDOR / Math.max(1, metrics.totalCount) * 100,
                ruinousEmpathyPercent: metrics.quadrantDistribution.RUINOUS_EMPATHY / Math.max(1, metrics.totalCount) * 100,
                aggressionPercent: metrics.quadrantDistribution.OBNOXIOUS_AGGRESSION / Math.max(1, metrics.totalCount) * 100,
            },
        });
    }
}

export const radicalCandorService = new RadicalCandorService();
