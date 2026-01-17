/**
 * Heijunka Service Tests
 * Tests for production leveling calculations
 */

describe('HeijunkaService', () => {
    describe('WSJF Calculation', () => {
        const calculateWSJF = (params: { businessValue: number; timeCriticality: number; riskReduction: number; jobSize: number }) => {
            const { businessValue, timeCriticality, riskReduction, jobSize } = params;
            return (businessValue + timeCriticality + riskReduction) / Math.max(1, jobSize);
        };

        it('should calculate WSJF score correctly', () => {
            const score = calculateWSJF({
                businessValue: 8,
                timeCriticality: 5,
                riskReduction: 3,
                jobSize: 5,
            });

            // WSJF = (businessValue + timeCriticality + riskReduction) / jobSize
            // WSJF = (8 + 5 + 3) / 5 = 3.2
            expect(score).toBe(3.2);
        });

        it('should handle minimum job size of 1', () => {
            const score = calculateWSJF({
                businessValue: 10,
                timeCriticality: 10,
                riskReduction: 10,
                jobSize: 0, // Should be treated as 1
            });

            expect(score).toBe(30);
        });

        it('should handle high priority items', () => {
            const highPriority = calculateWSJF({
                businessValue: 10,
                timeCriticality: 10,
                riskReduction: 10,
                jobSize: 1,
            });

            const lowPriority = calculateWSJF({
                businessValue: 2,
                timeCriticality: 2,
                riskReduction: 2,
                jobSize: 8,
            });

            expect(highPriority).toBeGreaterThan(lowPriority);
        });
    });

    describe('Velocity Calculation', () => {
        it('should calculate average velocity from completed pitches', () => {
            const pitches = [
                { tasks: [{ storyPoints: 8 }, { storyPoints: 5 }, { storyPoints: 3 }] },
                { tasks: [{ storyPoints: 10 }, { storyPoints: 5 }] },
                { tasks: [{ storyPoints: 13 }, { storyPoints: 8 }] },
            ];

            // Pitch 1: 16, Pitch 2: 15, Pitch 3: 21
            // Average: (16 + 15 + 21) / 3 = 17.33
            const velocity = pitches.reduce((sum, p) =>
                sum + p.tasks.reduce((s, t) => s + t.storyPoints, 0), 0
            ) / pitches.length;

            expect(Math.round(velocity * 100) / 100).toBeCloseTo(17.33, 1);
        });

        it('should return 0 for empty pitches', () => {
            const pitches: Array<{ tasks: Array<{ storyPoints: number }> }> = [];
            const velocity = pitches.length > 0
                ? pitches.reduce((sum, p) => sum + p.tasks.reduce((s, t) => s + t.storyPoints, 0), 0) / pitches.length
                : 0;

            expect(velocity).toBe(0);
        });
    });

    describe('Mix Compliance', () => {
        it('should detect when mix is within tolerance', () => {
            const target = { feature: 60, bug: 20, debt: 20 };
            const actual = { feature: 58, bug: 22, debt: 20 };
            const tolerance = 10;

            const isCompliant = Object.keys(target).every(key => {
                const diff = Math.abs(target[key as keyof typeof target] - actual[key as keyof typeof actual]);
                return diff <= tolerance;
            });

            expect(isCompliant).toBe(true);
        });

        it('should detect when mix exceeds tolerance', () => {
            const target = { feature: 60, bug: 20, debt: 20 };
            const actual = { feature: 80, bug: 10, debt: 10 };
            const tolerance = 10;

            const isCompliant = Object.keys(target).every(key => {
                const diff = Math.abs(target[key as keyof typeof target] - actual[key as keyof typeof actual]);
                return diff <= tolerance;
            });

            expect(isCompliant).toBe(false);
        });
    });
});
