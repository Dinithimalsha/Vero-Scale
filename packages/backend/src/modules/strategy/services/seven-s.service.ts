/**
 * McKinsey 7S Diagnostic Service
 * Organizational alignment assessment with live system linking
 * 
 * The 7S Framework: Strategy, Structure, Systems, Shared Values, Style, Staff, Skills
 * Per CEO: Link to actual system/repo status
 */

import { prisma } from '../../../config/database';
import type { SevenSDiagnostic } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface SurveyResponse {
    respondentId: string;
    strategy: number;      // 1-10
    structure: number;
    systems: number;
    sharedValues: number;
    style: number;
    staff: number;
    skills: number;
    comments?: Record<string, string>;
}

export interface DiagnosticInput {
    organizationId: string;
    responses: SurveyResponse[];
    systemLinks?: SystemLinks;
}

export interface SystemLinks {
    strategy?: { status: 'documented' | 'evolving' | 'unclear'; artifacts: string[] };
    structure?: { status: 'flat' | 'hierarchical' | 'matrix'; orgChartUrl?: string };
    systems?: { repos: SystemRepoLink[]; services: SystemServiceLink[] };
    sharedValues?: { missionUrl?: string; lastUpdated?: Date };
    style?: { leadershipModel: string };
    staff?: { totalHeadcount: number; openRoles: number };
    skills?: { techStack: string[]; gaps: string[] };
}

export interface SystemRepoLink {
    name: string;
    url: string;
    status: 'active' | 'legacy' | 'deprecated';
    lastCommit?: Date;
}

export interface SystemServiceLink {
    name: string;
    healthEndpoint?: string;
    status: 'healthy' | 'degraded' | 'down';
}

export interface DiagnosticResult extends SevenSDiagnostic {
    alignment: {
        overallScore: number;
        hardElements: { score: number; elements: string[] };
        softElements: { score: number; elements: string[] };
    };
    recommendations: string[];
}

export interface MisalignmentAlert {
    element: string;
    score: number;
    gap: number;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
}

// ═══════════════════════════════════════════════════════════════════
// 7S CATEGORIES
// ═══════════════════════════════════════════════════════════════════

const SEVEN_S = {
    hard: ['strategy', 'structure', 'systems'] as const,
    soft: ['sharedValues', 'style', 'staff', 'skills'] as const,
    all: ['strategy', 'structure', 'systems', 'sharedValues', 'style', 'staff', 'skills'] as const,
};

const MISALIGNMENT_RECOMMENDATIONS: Record<string, (gap: number) => string> = {
    strategy: (gap) => gap > 2
        ? 'Critical: Strategic direction unclear. Schedule strategy offsite.'
        : 'Strategy communication needs improvement.',
    structure: (gap) => gap > 2
        ? 'Organizational structure may be hindering execution. Review reporting lines.'
        : 'Consider documenting roles and responsibilities more clearly.',
    systems: (gap) => gap > 2
        ? 'Technical systems are blocking progress. Prioritize infrastructure investment.'
        : 'Systems need incremental improvements.',
    sharedValues: (gap) => gap > 2
        ? 'Cultural alignment is weak. Revisit mission/values with leadership team.'
        : 'Reinforce values through regular communication.',
    style: (gap) => gap > 2
        ? 'Leadership style may be misaligned with team expectations. Consider 360 feedback.'
        : 'Minor adjustments to leadership approach may help.',
    staff: (gap) => gap > 2
        ? 'Staffing gaps are critical. Accelerate hiring or redistribute workload.'
        : 'Address key skill gaps in upcoming hires.',
    skills: (gap) => gap > 2
        ? 'Significant skill gaps detected. Invest in training or strategic hiring.'
        : 'Consider targeted training programs.',
};

// ═══════════════════════════════════════════════════════════════════
// 7S DIAGNOSTIC SERVICE
// ═══════════════════════════════════════════════════════════════════

export class SevenSService {
    /**
     * Create a new diagnostic from survey responses
     */
    async createDiagnostic(input: DiagnosticInput): Promise<DiagnosticResult> {
        const { organizationId, responses, systemLinks } = input;

        if (responses.length === 0) {
            throw new Error('At least one survey response required');
        }

        // Aggregate scores
        const aggregated = this.aggregateResponses(responses);

        // Detect misalignments
        const misalignmentFlags = this.detectMisalignments(aggregated);
        const recommendations = this.generateRecommendations(aggregated, misalignmentFlags);

        // Create diagnostic
        const diagnostic = await prisma.sevenSDiagnostic.create({
            data: {
                organizationId,
                respondentCount: responses.length,
                strategyScore: aggregated.strategy,
                structureScore: aggregated.structure,
                systemsScore: aggregated.systems,
                sharedValuesScore: aggregated.sharedValues,
                styleScore: aggregated.style,
                staffScore: aggregated.staff,
                skillsScore: aggregated.skills,
                systemLinks: systemLinks ? JSON.parse(JSON.stringify(systemLinks)) : null,
                misalignmentFlags,
                recommendations,
            },
        });

        return this.enrichDiagnostic(diagnostic);
    }

    /**
     * Get latest diagnostic for organization
     */
    async getLatest(organizationId: string): Promise<DiagnosticResult | null> {
        const diagnostic = await prisma.sevenSDiagnostic.findFirst({
            where: { organizationId },
            orderBy: { surveyDate: 'desc' },
        });

        return diagnostic ? this.enrichDiagnostic(diagnostic) : null;
    }

    /**
     * Get diagnostic history
     */
    async getHistory(organizationId: string, limit: number = 12): Promise<SevenSDiagnostic[]> {
        return prisma.sevenSDiagnostic.findMany({
            where: { organizationId },
            orderBy: { surveyDate: 'desc' },
            take: limit,
        });
    }

    /**
     * Get misalignment alerts
     */
    async getMisalignmentAlerts(organizationId: string): Promise<MisalignmentAlert[]> {
        const latest = await this.getLatest(organizationId);
        if (!latest) return [];

        const scores: Record<string, number> = {
            strategy: Number(latest.strategyScore),
            structure: Number(latest.structureScore),
            systems: Number(latest.systemsScore),
            sharedValues: Number(latest.sharedValuesScore),
            style: Number(latest.styleScore),
            staff: Number(latest.staffScore),
            skills: Number(latest.skillsScore),
        };

        const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / 7;
        const alerts: MisalignmentAlert[] = [];

        for (const [element, score] of Object.entries(scores)) {
            const gap = avgScore - score;
            if (gap > 1) {
                alerts.push({
                    element,
                    score,
                    gap: Math.round(gap * 10) / 10,
                    severity: gap > 2 ? 'high' : gap > 1.5 ? 'medium' : 'low',
                    recommendation: MISALIGNMENT_RECOMMENDATIONS[element]?.(gap) ?? 'Review and address gap.',
                });
            }
        }

        return alerts.sort((a, b) => b.gap - a.gap);
    }

    /**
     * Update system links
     */
    async updateSystemLinks(
        diagnosticId: string,
        systemLinks: SystemLinks
    ): Promise<SevenSDiagnostic> {
        return prisma.sevenSDiagnostic.update({
            where: { id: diagnosticId },
            data: { systemLinks: JSON.parse(JSON.stringify(systemLinks)) },
        });
    }

    /**
     * Get radar chart data for visualization
     */
    getRadarData(diagnostic: SevenSDiagnostic): Array<{ element: string; score: number; max: number }> {
        return [
            { element: 'Strategy', score: Number(diagnostic.strategyScore), max: 10 },
            { element: 'Structure', score: Number(diagnostic.structureScore), max: 10 },
            { element: 'Systems', score: Number(diagnostic.systemsScore), max: 10 },
            { element: 'Shared Values', score: Number(diagnostic.sharedValuesScore), max: 10 },
            { element: 'Style', score: Number(diagnostic.styleScore), max: 10 },
            { element: 'Staff', score: Number(diagnostic.staffScore), max: 10 },
            { element: 'Skills', score: Number(diagnostic.skillsScore), max: 10 },
        ];
    }

    /**
     * Compare two diagnostics
     */
    async compareDiagnostics(id1: string, id2: string): Promise<{
        improvements: string[];
        declines: string[];
        unchanged: string[];
    }> {
        const [d1, d2] = await Promise.all([
            prisma.sevenSDiagnostic.findUnique({ where: { id: id1 } }),
            prisma.sevenSDiagnostic.findUnique({ where: { id: id2 } }),
        ]);

        if (!d1 || !d2) {
            throw new Error('Diagnostic not found');
        }

        const result = { improvements: [] as string[], declines: [] as string[], unchanged: [] as string[] };

        const elements = [
            { name: 'Strategy', key: 'strategyScore' },
            { name: 'Structure', key: 'structureScore' },
            { name: 'Systems', key: 'systemsScore' },
            { name: 'Shared Values', key: 'sharedValuesScore' },
            { name: 'Style', key: 'styleScore' },
            { name: 'Staff', key: 'staffScore' },
            { name: 'Skills', key: 'skillsScore' },
        ];

        for (const el of elements) {
            const score1 = Number((d1 as Record<string, unknown>)[el.key]);
            const score2 = Number((d2 as Record<string, unknown>)[el.key]);
            const diff = score2 - score1;

            if (diff > 0.5) {
                result.improvements.push(`${el.name}: +${diff.toFixed(1)}`);
            } else if (diff < -0.5) {
                result.declines.push(`${el.name}: ${diff.toFixed(1)}`);
            } else {
                result.unchanged.push(el.name);
            }
        }

        return result;
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════════

    private aggregateResponses(responses: SurveyResponse[]): Record<string, number> {
        const totals: Record<string, number> = {
            strategy: 0, structure: 0, systems: 0,
            sharedValues: 0, style: 0, staff: 0, skills: 0,
        };

        for (const r of responses) {
            totals.strategy += r.strategy;
            totals.structure += r.structure;
            totals.systems += r.systems;
            totals.sharedValues += r.sharedValues;
            totals.style += r.style;
            totals.staff += r.staff;
            totals.skills += r.skills;
        }

        const count = responses.length;
        return {
            strategy: Math.round((totals.strategy / count) * 10) / 10,
            structure: Math.round((totals.structure / count) * 10) / 10,
            systems: Math.round((totals.systems / count) * 10) / 10,
            sharedValues: Math.round((totals.sharedValues / count) * 10) / 10,
            style: Math.round((totals.style / count) * 10) / 10,
            staff: Math.round((totals.staff / count) * 10) / 10,
            skills: Math.round((totals.skills / count) * 10) / 10,
        };
    }

    private detectMisalignments(scores: Record<string, number>): string[] {
        const flags: string[] = [];
        const values = Object.values(scores);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const threshold = 1.5;

        // Hard vs Soft imbalance
        const hardAvg = (scores.strategy + scores.structure + scores.systems) / 3;
        const softAvg = (scores.sharedValues + scores.style + scores.staff + scores.skills) / 4;

        if (Math.abs(hardAvg - softAvg) > 2) {
            flags.push(hardAvg > softAvg
                ? 'HARD_SOFT_IMBALANCE: Hard elements stronger than soft'
                : 'HARD_SOFT_IMBALANCE: Soft elements stronger than hard');
        }

        // Individual element gaps
        for (const [key, value] of Object.entries(scores)) {
            if (avg - value > threshold) {
                flags.push(`LOW_${key.toUpperCase()}: Score ${value} is ${(avg - value).toFixed(1)} below average`);
            }
        }

        return flags;
    }

    private generateRecommendations(
        scores: Record<string, number>,
        flags: string[]
    ): string[] {
        const recommendations: string[] = [];
        const avg = Object.values(scores).reduce((a, b) => a + b, 0) / 7;

        // Add recommendations based on lowest scores
        const sorted = Object.entries(scores).sort(([, a], [, b]) => a - b);
        const [lowestKey, lowestScore] = sorted[0];

        if (lowestScore < avg - 1) {
            const rec = MISALIGNMENT_RECOMMENDATIONS[lowestKey]?.(avg - lowestScore);
            if (rec) recommendations.push(rec);
        }

        // Hard/soft balance recommendation
        if (flags.some(f => f.includes('HARD_SOFT_IMBALANCE'))) {
            recommendations.push(
                'Address the imbalance between tangible (Strategy, Structure, Systems) and intangible (Values, Style, Staff, Skills) elements.'
            );
        }

        // Overall health
        if (avg < 5) {
            recommendations.push('Overall organizational health is concerning. Consider comprehensive review.');
        } else if (avg < 7) {
            recommendations.push('Organization is performing adequately but has room for improvement.');
        }

        return recommendations;
    }

    private enrichDiagnostic(diagnostic: SevenSDiagnostic): DiagnosticResult {
        const scores = {
            strategy: Number(diagnostic.strategyScore),
            structure: Number(diagnostic.structureScore),
            systems: Number(diagnostic.systemsScore),
            sharedValues: Number(diagnostic.sharedValuesScore),
            style: Number(diagnostic.styleScore),
            staff: Number(diagnostic.staffScore),
            skills: Number(diagnostic.skillsScore),
        };

        const hardScore = (scores.strategy + scores.structure + scores.systems) / 3;
        const softScore = (scores.sharedValues + scores.style + scores.staff + scores.skills) / 4;
        const overallScore = Object.values(scores).reduce((a, b) => a + b, 0) / 7;

        return {
            ...diagnostic,
            alignment: {
                overallScore: Math.round(overallScore * 10) / 10,
                hardElements: {
                    score: Math.round(hardScore * 10) / 10,
                    elements: SEVEN_S.hard as unknown as string[],
                },
                softElements: {
                    score: Math.round(softScore * 10) / 10,
                    elements: SEVEN_S.soft as unknown as string[],
                },
            },
            recommendations: diagnostic.recommendations,
        };
    }
}

export const sevenSService = new SevenSService();
