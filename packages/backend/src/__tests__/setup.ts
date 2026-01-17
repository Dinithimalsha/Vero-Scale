/**
 * Test Setup
 * Global configuration for Jest tests
 */

import { prisma } from '../config/database';

// Increase timeout for database operations
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
    await prisma.$disconnect();
});

// Mock console.log in tests to reduce noise
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
};

// Global test utilities
export const testUtils = {
    /**
     * Generate a random UUID for testing
     */
    randomId: () => crypto.randomUUID(),

    /**
     * Create test organization data
     */
    mockOrganization: (overrides = {}) => ({
        id: crypto.randomUUID(),
        name: 'Test Organization',
        slug: 'test-org',
        featureRatio: 60,
        bugRatio: 20,
        debtRatio: 20,
        ...overrides,
    }),

    /**
     * Create test user data
     */
    mockUser: (organizationId: string, overrides = {}) => ({
        id: crypto.randomUUID(),
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        role: 'MEMBER' as const,
        organizationId,
        ...overrides,
    }),

    /**
     * Wait for async operations
     */
    wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};
