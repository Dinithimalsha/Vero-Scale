/**
 * Environment Configuration
 * Centralized config with validation
 */

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// 🛡️ TEST HARNESS BYPASS
// If running in test mode, inject mock values to prevent Zod validation failure.
if (process.env.NODE_ENV === 'test') {
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mock:5432/test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'mock-secret-key-32-chars-minimum-length-required';
    process.env.PORT = process.env.PORT || '3000';
}

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url(),

    // Server
    PORT: z.string().default('3001').transform(Number),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Frontend
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),

    // Auth
    JWT_SECRET: z.string().min(32),

    // GitHub (optional in dev)
    GITHUB_APP_ID: z.string().optional(),
    GITHUB_PRIVATE_KEY: z.string().optional(),
    GITHUB_WEBHOOK_SECRET: z.string().optional(),

    // Slack (optional in dev)
    SLACK_BOT_TOKEN: z.string().optional(),
    SLACK_SIGNING_SECRET: z.string().optional(),
    SLACK_CRITICAL_CHANNEL: z.string().default('#engineering-critical'),

    // Plaid (optional in dev)
    PLAID_CLIENT_ID: z.string().optional(),
    PLAID_SECRET: z.string().optional(),
    PLAID_ENV: z.enum(['sandbox', 'development', 'production']).default('sandbox'),

    // DocuSign (optional in dev)
    DOCUSIGN_INTEGRATION_KEY: z.string().optional(),
    DOCUSIGN_USER_ID: z.string().optional(),
    DOCUSIGN_ACCOUNT_ID: z.string().optional(),
    DOCUSIGN_BASE_PATH: z.string().url().default('https://demo.docusign.net/restapi'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.format());
    process.exit(1);
}

export const config = {
    // Database
    databaseUrl: parsed.data.DATABASE_URL,

    // Server
    port: parsed.data.PORT,
    nodeEnv: parsed.data.NODE_ENV,
    isDev: parsed.data.NODE_ENV === 'development',
    isProd: parsed.data.NODE_ENV === 'production',
    isTest: parsed.data.NODE_ENV === 'test',

    // Frontend
    frontendUrl: parsed.data.FRONTEND_URL,

    // Auth
    jwtSecret: parsed.data.JWT_SECRET,

    // GitHub
    github: {
        appId: parsed.data.GITHUB_APP_ID,
        privateKey: parsed.data.GITHUB_PRIVATE_KEY,
        webhookSecret: parsed.data.GITHUB_WEBHOOK_SECRET,
    },

    // Slack
    slack: {
        botToken: parsed.data.SLACK_BOT_TOKEN,
        signingSecret: parsed.data.SLACK_SIGNING_SECRET,
        criticalChannel: parsed.data.SLACK_CRITICAL_CHANNEL,
    },

    // Plaid
    plaid: {
        clientId: parsed.data.PLAID_CLIENT_ID,
        secret: parsed.data.PLAID_SECRET,
        env: parsed.data.PLAID_ENV,
    },

    // DocuSign
    docusign: {
        integrationKey: parsed.data.DOCUSIGN_INTEGRATION_KEY,
        userId: parsed.data.DOCUSIGN_USER_ID,
        accountId: parsed.data.DOCUSIGN_ACCOUNT_ID,
        basePath: parsed.data.DOCUSIGN_BASE_PATH,
    },
} as const;

export type Config = typeof config;
