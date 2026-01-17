import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'], // Integration tests usually named *.test.ts vs *.spec.ts or separate dir
        exclude: ['src/**/*.spec.ts', 'src/__tests__/**/*'], // Exclude unit tests if they are in __tests__
        environment: 'node',
        testTimeout: 10000,
    },
});
