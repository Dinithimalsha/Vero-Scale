/**
 * Topgrading Service - A-Player Hiring System
 * Job Scorecards, structured interviews, and candidate pattern recognition
 * 
 * Per CEO: Focus on data, avoid bias-prone keywords
 */

import { prisma } from '../../../config/database';
import type { JobScorecard, CandidateEvaluation, EvaluationStatus } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface CreateScorecardInput {
    organizationId: string;
    title: string;
    department?: string;
    outcomes: string[];      // Clear success metrics
    competencies: string[];  // Required skills
}

export interface JobHistoryEntry {
    company: string;
    role: string;
    tenure: number;          // Months
    bossRating?: number;     // 1-10
    reasonForLeaving?: string;
    accomplishments?: string[];
}

export interface CreateEvaluationInput {
    scorecardId: string;
    candidateName: string;
    candidateEmail?: string;
    jobHistory?: JobHistoryEntry[];
}

export interface InterviewQuestion {
    category: 'outcomes' | 'competencies' | 'history' | 'motivations';
    question: string;
    followUps: string[];
    lookingFor: string;
    redFlags: string[];
}

export interface InterviewGuide {
    scorecardId: string;
    title: string;
    sections: Array<{
        name: string;
        duration: number;      // Minutes
        questions: InterviewQuestion[];
    }>;
}

export interface CandidateRiskFlag {
    category: 'tenure' | 'external_locus' | 'gaps' | 'progression';
    severity: 'low' | 'medium' | 'high';
    description: string;
    evidence: string;
}

export interface PatternAnalysis {
    tenurePattern: 'stable' | 'jumper' | 'growth' | 'mixed';
    avgTenureMonths: number;
    externalLocusCount: number;
    progressionTrend: 'ascending' | 'lateral' | 'descending';
    riskFlags: CandidateRiskFlag[];
    strengths: string[];
    overallScore: number;
}

// ═══════════════════════════════════════════════════════════════════
// RISK PATTERNS
// Per CEO: Trajectory data, not keyword bias
// ═══════════════════════════════════════════════════════════════════

const EXTERNAL_LOCUS_PATTERNS = [
    /laid off/i, /company closed/i, /downsizing/i, /restructuring/i,
    /bad boss/i, /toxic/i, /politics/i, /unfair/i,
    /wasn't recognized/i, /passed over/i, /no growth/i,
];

const ACCOMPLISHMENT_KEYWORDS = [
    'increased', 'grew', 'improved', 'led', 'built', 'launched',
    'saved', 'reduced', 'achieved', 'delivered', 'created', 'pioneered',
];

// ═══════════════════════════════════════════════════════════════════
// TOPGRADING SERVICE
// ═══════════════════════════════════════════════════════════════════

export class TopgradingService {
    /**
     * Create a job scorecard
     */
    async createScorecard(input: CreateScorecardInput): Promise<JobScorecard> {
        return prisma.jobScorecard.create({
            data: {
                organizationId: input.organizationId,
                title: input.title,
                department: input.department,
                outcomes: input.outcomes,
                competencies: input.competencies,
            },
        });
    }

    /**
     * Update scorecard
     */
    async updateScorecard(
        scorecardId: string,
        updates: Partial<Pick<JobScorecard, 'title' | 'department' | 'outcomes' | 'competencies'>>
    ): Promise<JobScorecard> {
        return prisma.jobScorecard.update({
            where: { id: scorecardId },
            data: updates,
        });
    }

    /**
     * Get scorecards for organization
     */
    async getScorecards(organizationId: string): Promise<JobScorecard[]> {
        return prisma.jobScorecard.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Create candidate evaluation
     */
    async createEvaluation(input: CreateEvaluationInput): Promise<CandidateEvaluation> {
        // Analyze job history if provided
        let patternAnalysis: PatternAnalysis | null = null;
        if (input.jobHistory && input.jobHistory.length > 0) {
            patternAnalysis = this.analyzePatterns(input.jobHistory);
        }

        return prisma.candidateEvaluation.create({
            data: {
                scorecardId: input.scorecardId,
                candidateName: input.candidateName,
                candidateEmail: input.candidateEmail,
                jobHistory: input.jobHistory ? JSON.parse(JSON.stringify(input.jobHistory)) : null,
                externalLocusCount: patternAnalysis?.externalLocusCount ?? 0,
                tenurePattern: patternAnalysis?.tenurePattern,
                riskFlags: patternAnalysis?.riskFlags.map(f => f.description) ?? [],
                strengths: patternAnalysis?.strengths ?? [],
                overallScore: patternAnalysis?.overallScore,
                status: 'IN_PROGRESS',
            },
        });
    }

    /**
     * Analyze candidate patterns from job history
     * Per CEO: Trajectory data, not keyword bias
     */
    analyzePatterns(jobHistory: JobHistoryEntry[]): PatternAnalysis {
        const riskFlags: CandidateRiskFlag[] = [];
        const strengths: string[] = [];

        // Calculate average tenure
        const tenures = jobHistory.map(j => j.tenure);
        const avgTenure = tenures.reduce((a, b) => a + b, 0) / tenures.length;

        // Tenure pattern
        let tenurePattern: 'stable' | 'jumper' | 'growth' | 'mixed' = 'mixed';
        if (avgTenure >= 36) {
            tenurePattern = 'stable';
            strengths.push('Strong tenure pattern - demonstrates commitment');
        } else if (avgTenure < 18) {
            tenurePattern = 'jumper';
            riskFlags.push({
                category: 'tenure',
                severity: avgTenure < 12 ? 'high' : 'medium',
                description: 'Short average tenure',
                evidence: `Average tenure: ${Math.round(avgTenure)} months`,
            });
        } else if (tenures.every((t, i) => i === 0 || t >= tenures[i - 1])) {
            tenurePattern = 'growth';
            strengths.push('Increasing tenure over time - showing growth');
        }

        // External locus of control detection
        let externalLocusCount = 0;
        for (const job of jobHistory) {
            if (job.reasonForLeaving) {
                for (const pattern of EXTERNAL_LOCUS_PATTERNS) {
                    if (pattern.test(job.reasonForLeaving)) {
                        externalLocusCount++;
                        break;
                    }
                }
            }
        }

        if (externalLocusCount >= 2) {
            riskFlags.push({
                category: 'external_locus',
                severity: externalLocusCount >= 3 ? 'high' : 'medium',
                description: 'Multiple external-locus explanations for departures',
                evidence: `${externalLocusCount} instances detected`,
            });
        }

        // Progression trend
        let progressionTrend: 'ascending' | 'lateral' | 'descending' = 'lateral';
        const bossRatings = jobHistory.map(j => j.bossRating).filter((r): r is number => r !== undefined);
        if (bossRatings.length >= 2) {
            const trend = bossRatings[bossRatings.length - 1] - bossRatings[0];
            if (trend > 1) {
                progressionTrend = 'ascending';
                strengths.push('Improving boss ratings over time');
            } else if (trend < -1) {
                progressionTrend = 'descending';
                riskFlags.push({
                    category: 'progression',
                    severity: 'medium',
                    description: 'Declining boss ratings',
                    evidence: `Trend: ${trend.toFixed(1)}`,
                });
            }
        }

        // Check for accomplishments
        const accomplishmentCount = jobHistory.reduce((count, job) => {
            if (job.accomplishments) {
                const hasImpact = job.accomplishments.some(a =>
                    ACCOMPLISHMENT_KEYWORDS.some(k => a.toLowerCase().includes(k))
                );
                return count + (hasImpact ? 1 : 0);
            }
            return count;
        }, 0);

        if (accomplishmentCount >= jobHistory.length * 0.7) {
            strengths.push('Strong track record of measurable accomplishments');
        }

        // Calculate overall score
        let score = 5; // Base score
        score += tenurePattern === 'stable' ? 2 : tenurePattern === 'growth' ? 1 : tenurePattern === 'jumper' ? -2 : 0;
        score -= externalLocusCount * 0.5;
        score += progressionTrend === 'ascending' ? 1 : progressionTrend === 'descending' ? -1 : 0;
        score += strengths.length * 0.5;
        score -= riskFlags.filter(f => f.severity === 'high').length * 1.5;
        score -= riskFlags.filter(f => f.severity === 'medium').length * 0.5;

        return {
            tenurePattern,
            avgTenureMonths: Math.round(avgTenure),
            externalLocusCount,
            progressionTrend,
            riskFlags,
            strengths,
            overallScore: Math.max(1, Math.min(10, Math.round(score))),
        };
    }

    /**
     * Generate structured interview guide
     */
    generateInterviewGuide(scorecard: JobScorecard): InterviewGuide {
        const sections: InterviewGuide['sections'] = [];

        // Opening/Rapport (5 min)
        sections.push({
            name: 'Opening',
            duration: 5,
            questions: [{
                category: 'motivations',
                question: 'Thank you for your time. Before we dive in, what attracted you to this opportunity?',
                followUps: ['What do you know about our company?', 'What would success look like for you here?'],
                lookingFor: 'Research, genuine interest, aligned motivations',
                redFlags: ['No research', 'Only focused on compensation', 'Vague answers'],
            }],
        });

        // Career History (20 min)
        sections.push({
            name: 'Career Chronology',
            duration: 20,
            questions: [
                {
                    category: 'history',
                    question: 'Walk me through your career, starting with your first professional role. For each, tell me: What were you hired to do? What did you accomplish? Who was your boss and what would they say about you? Why did you leave?',
                    followUps: [
                        'What were the low points of that role?',
                        'What was the boss\'s name and how do you spell it?',
                        'Would you work for them again?',
                    ],
                    lookingFor: 'Specificity, ownership, growth trajectory',
                    redFlags: ['Vague accomplishments', 'Blames others', 'Cannot recall boss names'],
                },
            ],
        });

        // Outcome-Based Questions
        if (scorecard.outcomes.length > 0) {
            const outcomeQuestions: InterviewQuestion[] = scorecard.outcomes.slice(0, 4).map(outcome => ({
                category: 'outcomes' as const,
                question: `This role requires "${outcome}". Tell me about a time you achieved something similar.`,
                followUps: [
                    'What was the specific result?',
                    'What was your unique contribution?',
                    'What would you do differently?',
                ],
                lookingFor: 'STAR format, quantified results, self-awareness',
                redFlags: ['No metrics', 'Team results without personal contribution', '"We" without "I"'],
            }));

            sections.push({
                name: 'Mission Outcomes',
                duration: 15,
                questions: outcomeQuestions,
            });
        }

        // Competency-Based Questions
        if (scorecard.competencies.length > 0) {
            const compQuestions: InterviewQuestion[] = scorecard.competencies.slice(0, 4).map(comp => ({
                category: 'competencies' as const,
                question: `Rate yourself 1-10 on "${comp}" and give me an example that justifies that rating.`,
                followUps: [
                    'What would your last manager rate you?',
                    'How have you improved in this area?',
                ],
                lookingFor: 'Self-awareness, specific examples, growth mindset',
                redFlags: ['Inflated self-rating', 'No examples', 'Defensive responses'],
            }));

            sections.push({
                name: 'Competencies',
                duration: 15,
                questions: compQuestions,
            });
        }

        // Closing
        sections.push({
            name: 'Closing',
            duration: 5,
            questions: [{
                category: 'motivations',
                question: 'What questions do you have for me about the role or company?',
                followUps: ['Is there anything that would prevent you from accepting an offer?'],
                lookingFor: 'Thoughtful questions, genuine curiosity',
                redFlags: ['No questions', 'Only compensation questions'],
            }],
        });

        return {
            scorecardId: scorecard.id,
            title: `Interview Guide: ${scorecard.title}`,
            sections,
        };
    }

    /**
     * Update evaluation with interview results
     */
    async updateEvaluation(
        evaluationId: string,
        updates: {
            overallScore?: number;
            recommendation?: string;
            status?: EvaluationStatus;
            riskFlags?: string[];
            strengths?: string[];
        }
    ): Promise<CandidateEvaluation> {
        return prisma.candidateEvaluation.update({
            where: { id: evaluationId },
            data: updates,
        });
    }

    /**
     * Get evaluations for a scorecard
     */
    async getEvaluations(
        scorecardId: string,
        status?: EvaluationStatus
    ): Promise<CandidateEvaluation[]> {
        return prisma.candidateEvaluation.findMany({
            where: {
                scorecardId,
                ...(status && { status }),
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get pipeline summary for hiring manager
     */
    async getPipelineSummary(organizationId: string): Promise<{
        activeScorecards: number;
        totalCandidates: number;
        byStatus: Record<EvaluationStatus, number>;
        avgScore: number;
        highRiskCount: number;
    }> {
        const scorecards = await prisma.jobScorecard.findMany({
            where: { organizationId },
            include: {
                candidates: true,
            },
        });

        const allCandidates = scorecards.flatMap(s => s.candidates);

        const byStatus: Record<EvaluationStatus, number> = {
            IN_PROGRESS: 0,
            PENDING_REVIEW: 0,
            APPROVED: 0,
            REJECTED: 0,
        };

        let totalScore = 0;
        let scoreCount = 0;
        let highRiskCount = 0;

        for (const c of allCandidates) {
            byStatus[c.status]++;
            if (c.overallScore) {
                totalScore += c.overallScore;
                scoreCount++;
            }
            if (c.riskFlags.some(f => f.toLowerCase().includes('high'))) {
                highRiskCount++;
            }
        }

        return {
            activeScorecards: scorecards.length,
            totalCandidates: allCandidates.length,
            byStatus,
            avgScore: scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : 0,
            highRiskCount,
        };
    }
}

export const topgradingService = new TopgradingService();
