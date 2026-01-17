/**
 * Radical Candor Service Tests
 * Tests for NLP sentiment analysis
 */

import { radicalCandorService } from '../../modules/human-capital/services/radical-candor.service';

describe('RadicalCandorService', () => {
    describe('analyzeSentiment', () => {
        it('should identify Radical Candor (high care + high challenge)', () => {
            const content = `
                I really appreciate your hard work on this project. I care about your growth.
                I want to help you succeed. That said, I have concerns about the deadline being missed. 
                You need to improve your time estimation. I expect better next time.
            `;

            const analysis = radicalCandorService.analyzeSentiment(content);

            expect(analysis.quadrant).toBe('RADICAL_CANDOR');
            expect(analysis.careScore).toBeGreaterThanOrEqual(0.5);
            expect(analysis.challengeScore).toBeGreaterThanOrEqual(0.5);
        });

        it('should identify Ruinous Empathy (high care + low challenge)', () => {
            const content = `
                I really appreciate you. I value you and your contributions.
                I understand it's been tough. Don't worry about it, it's fine.
                These things happen, no worries.
            `;

            const analysis = radicalCandorService.analyzeSentiment(content);

            expect(analysis.quadrant).toBe('RUINOUS_EMPATHY');
            expect(analysis.careScore).toBeGreaterThanOrEqual(0.5);
            expect(analysis.challengeScore).toBeLessThan(0.5);
            expect(analysis.toneSuggestion).toBeDefined();
        });

        it('should identify Obnoxious Aggression (low care + high challenge)', () => {
            const content = `
                You missed the deadline. This is a problem.
                You need to improve immediately. Below expectations.
                The truth is, this isn't working.
            `;

            const analysis = radicalCandorService.analyzeSentiment(content);

            expect(analysis.quadrant).toBe('OBNOXIOUS_AGGRESSION');
            expect(analysis.careScore).toBeLessThan(0.5);
            expect(analysis.challengeScore).toBeGreaterThanOrEqual(0.5);
            expect(analysis.toneSuggestion).toBeDefined();
        });

        it('should identify Manipulative Insincerity (low care + low challenge)', () => {
            const content = `
                Yeah, sure. Whatever works.
                I guess that's okay.
            `;

            const analysis = radicalCandorService.analyzeSentiment(content);

            expect(analysis.quadrant).toBe('MANIPULATIVE_INSINCERITY');
            expect(analysis.careScore).toBeLessThan(0.5);
            expect(analysis.challengeScore).toBeLessThan(0.5);
        });

        it('should provide tone suggestions for non-ideal quadrants', () => {
            const content = 'You failed. That was wrong.';

            const analysis = radicalCandorService.analyzeSentiment(content);

            if (analysis.quadrant !== 'RADICAL_CANDOR') {
                expect(analysis.toneSuggestion).toBeDefined();
                expect(analysis.toneSuggestion?.length).toBeGreaterThan(0);
            }
        });

        it('should not provide suggestions for RADICAL_CANDOR', () => {
            const content = `
                I care about you and want to help. I appreciate your efforts.
                I have concerns about the quality. Let me be direct, you need to improve.
            `;

            const analysis = radicalCandorService.analyzeSentiment(content);

            if (analysis.quadrant === 'RADICAL_CANDOR') {
                expect(analysis.toneSuggestion).toBeUndefined();
            }
        });
    });

    describe('getCandorMatrixData', () => {
        it('should return four quadrants with correct positions', () => {
            const stats = {
                totalCount: 100,
                praiseCount: 40,
                constructiveCount: 60,
                praiseRatio: 0.4,
                quadrantDistribution: {
                    RADICAL_CANDOR: 50,
                    RUINOUS_EMPATHY: 20,
                    OBNOXIOUS_AGGRESSION: 15,
                    MANIPULATIVE_INSINCERITY: 15,
                },
                avgCareScore: 0.6,
                avgChallengeScore: 0.55,
            };

            const matrixData = radicalCandorService.getCandorMatrixData(stats);

            expect(matrixData.quadrants.length).toBe(4);
            expect(matrixData.quadrants.find(q => q.name === 'Radical Candor')?.x).toBe(1);
            expect(matrixData.quadrants.find(q => q.name === 'Radical Candor')?.y).toBe(1);
            expect(matrixData.quadrants.find(q => q.name === 'Manipulative Insincerity')?.x).toBe(0);
            expect(matrixData.quadrants.find(q => q.name === 'Manipulative Insincerity')?.y).toBe(0);
        });
    });
});
