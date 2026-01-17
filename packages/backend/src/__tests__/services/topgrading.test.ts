/**
 * Topgrading Service Tests
 * Tests for candidate pattern recognition
 */

import { topgradingService, JobHistoryEntry } from '../../modules/human-capital/services/topgrading.service';

describe('TopgradingService', () => {
    describe('analyzePatterns', () => {
        it('should identify stable tenure pattern', () => {
            const jobHistory: JobHistoryEntry[] = [
                { company: 'Company A', role: 'Engineer', tenure: 48, bossRating: 8 },
                { company: 'Company B', role: 'Senior Engineer', tenure: 36, bossRating: 9 },
            ];

            const analysis = topgradingService.analyzePatterns(jobHistory);

            expect(analysis.tenurePattern).toBe('stable');
            expect(analysis.avgTenureMonths).toBe(42);
            expect(analysis.strengths).toContain('Strong tenure pattern - demonstrates commitment');
        });

        it('should identify jumper pattern', () => {
            const jobHistory: JobHistoryEntry[] = [
                { company: 'Company A', role: 'Engineer', tenure: 8 },
                { company: 'Company B', role: 'Engineer', tenure: 10 },
                { company: 'Company C', role: 'Engineer', tenure: 6 },
            ];

            const analysis = topgradingService.analyzePatterns(jobHistory);

            expect(analysis.tenurePattern).toBe('jumper');
            expect(analysis.avgTenureMonths).toBe(8);
            expect(analysis.riskFlags.some(f => f.category === 'tenure')).toBe(true);
        });

        it('should detect external locus of control', () => {
            const jobHistory: JobHistoryEntry[] = [
                { company: 'A', role: 'Eng', tenure: 24, reasonForLeaving: 'Bad boss, toxic culture' },
                { company: 'B', role: 'Eng', tenure: 18, reasonForLeaving: 'Company downsizing' },
                { company: 'C', role: 'Eng', tenure: 12, reasonForLeaving: 'Wasn\'t recognized' },
            ];

            const analysis = topgradingService.analyzePatterns(jobHistory);

            expect(analysis.externalLocusCount).toBeGreaterThanOrEqual(2);
            expect(analysis.riskFlags.some(f => f.category === 'external_locus')).toBe(true);
        });

        it('should detect ascending progression', () => {
            const jobHistory: JobHistoryEntry[] = [
                { company: 'A', role: 'Junior', tenure: 24, bossRating: 6 },
                { company: 'B', role: 'Mid', tenure: 24, bossRating: 8 },
                { company: 'C', role: 'Senior', tenure: 24, bossRating: 9 },
            ];

            const analysis = topgradingService.analyzePatterns(jobHistory);

            expect(analysis.progressionTrend).toBe('ascending');
            expect(analysis.strengths).toContain('Improving boss ratings over time');
        });

        it('should calculate overall score in valid range', () => {
            const jobHistory: JobHistoryEntry[] = [
                { company: 'A', role: 'Engineer', tenure: 36, bossRating: 7 },
            ];

            const analysis = topgradingService.analyzePatterns(jobHistory);

            expect(analysis.overallScore).toBeGreaterThanOrEqual(1);
            expect(analysis.overallScore).toBeLessThanOrEqual(10);
        });
    });

    describe('generateInterviewGuide', () => {
        it('should generate guide with all sections', () => {
            const scorecard = {
                id: 'test-id',
                title: 'Senior Engineer',
                department: 'Engineering',
                outcomes: ['Ship 10 features', 'Mentor 2 juniors'],
                competencies: ['TypeScript', 'System Design'],
                organizationId: 'test-org',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const guide = topgradingService.generateInterviewGuide(scorecard);

            expect(guide.title).toContain('Senior Engineer');
            expect(guide.sections.length).toBeGreaterThan(0);
            expect(guide.sections.some(s => s.name === 'Opening')).toBe(true);
            expect(guide.sections.some(s => s.name === 'Career Chronology')).toBe(true);
            expect(guide.sections.some(s => s.name === 'Closing')).toBe(true);
        });

        it('should include outcome-based questions', () => {
            const scorecard = {
                id: 'test-id',
                title: 'PM',
                department: 'Product',
                outcomes: ['Launch product'],
                competencies: [],
                organizationId: 'test-org',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const guide = topgradingService.generateInterviewGuide(scorecard);
            const outcomeSection = guide.sections.find(s => s.name === 'Mission Outcomes');

            expect(outcomeSection).toBeDefined();
            expect(outcomeSection?.questions.some(q => q.question.includes('Launch product'))).toBe(true);
        });
    });
});
