import { vi, describe, it, expect, beforeEach } from 'vitest';

// 1. Mock the module properly (hoisted)
vi.mock('../../config/database', () => ({
    prisma: {
        organization: {
            findUnique: vi.fn(),
        },
        productionPitch: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        task: {
            findMany: vi.fn(),
            update: vi.fn(),
        },
        $transaction: vi.fn((callback) => {
            // If callback is an array of promises (which it is in our code), handle it
            if (Array.isArray(callback)) return Promise.all(callback);
            // If function (OLD way), call it. But our code passes array.
            // We can just return a resolved promise for the array.
            return Promise.resolve(callback);
        }),
    }
}));

// 2. Import the mocked module
import { prisma } from '../../config/database';
import { heijunkaService } from '../../modules/operations/services/heijunka.service';

describe('Heijunka Dampener & Scheduling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('calculateSmoothedPriority', () => {
        it('should dampen volatility using EMA formula', () => {
            const score = heijunkaService.calculateSmoothedPriority(10, 100, 0.2);
            expect(score).toBeCloseTo(28);
        });

        it('should respond faster with higher alpha', () => {
            const score = heijunkaService.calculateSmoothedPriority(10, 100, 0.8);
            expect(score).toBeCloseTo(82);
        });
    });

    describe('allocateSprintCapacity (Bucket Fill)', () => {
        const mockOrg = {
            id: 'org-1',
            featureRatio: 60,
            bugRatio: 20,
            debtRatio: 20,
        };

        const mockPitch = {
            id: 'pitch-1',
            capacityPoints: 100,
            currentLoad: 0,
            featurePoints: 0,
            bugPoints: 0,
            debtPoints: 0,
        };

        it('should skip tasks when bucket is full (The Balanced Scorecard)', async () => {
            // Setup Mocks
            (prisma.organization.findUnique as any).mockResolvedValue(mockOrg);
            (prisma.productionPitch.findUnique as any).mockResolvedValue(mockPitch);
            (prisma.productionPitch.update as any).mockResolvedValue(mockPitch);

            // Mock transaction to just resolve
            (prisma.$transaction as any).mockResolvedValue([]);
            (prisma.task.update as any).mockResolvedValue({});

            // Tasks with priorityScores (simulating persisted smoothed scores)
            const mockTasks = [
                { id: 't1', title: 'Feature 1', taskType: 'FEATURE', storyPoints: 20, priorityScore: 100 },
                { id: 't2', title: 'Feature 2', taskType: 'FEATURE', storyPoints: 20, priorityScore: 90 },
                { id: 't3', title: 'Feature 3', taskType: 'FEATURE', storyPoints: 20, priorityScore: 80 },
                { id: 't4', title: 'Feature 4', taskType: 'FEATURE', storyPoints: 20, priorityScore: 70 },
                { id: 't5', title: 'Debt 1', taskType: 'DEBT', storyPoints: 10, priorityScore: 60 },
            ];

            (prisma.task.findMany as any).mockResolvedValue(mockTasks);

            const result = await heijunkaService.allocateSprintCapacity('org-1', 'pitch-1');

            expect(result.scheduled).toBe(4);
            expect(result.skipped).toBe(1);
            expect(result.buckets.FEATURE.used).toBe(60);
            expect(result.buckets.DEBT.used).toBe(10);
        });
    });
});
