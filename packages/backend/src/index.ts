/**
 * VeroScale Backend Entry Point
 * Modular Monolith Architecture
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/environment';
import { errorHandler } from './shared/middleware/error-handler';
import { requestLogger } from './shared/middleware/request-logger';
import { swaggerSpec } from './docs/openapi';

// Auth Routes
import { authRoutes } from './auth/routes';

// Module Routes
import { operationsRoutes } from './modules/operations/routes';
import { legalRoutes } from './modules/legal/routes';
import { financeRoutes } from './modules/finance/routes';
import { strategyRoutes } from './modules/strategy/routes';
import { dataRoutes } from './modules/data/routes';
import { humanCapitalRoutes } from './modules/human-capital/routes';
import { webhookRoutes } from './integrations/webhooks/routes';

// Algorithmic Enterprise Routes
import dtoRoutes from './modules/dto/routes';
import marketsRoutes from './modules/markets/routes';
import governanceRoutes from './modules/governance/routes';
import zbbRoutes from './modules/finance/zbb.routes';
import complianceRoutes from './modules/compliance/routes';

const app = express();

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE STACK
// ═══════════════════════════════════════════════════════════════════

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// ═══════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════

app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        mode: config.nodeEnv,
    });
});

// ═══════════════════════════════════════════════════════════════════
// MODULE ROUTES (Strict Boundaries)
// ═══════════════════════════════════════════════════════════════════

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Authentication
app.use('/api/auth', authRoutes);

// Operations Module: Heijunka, Jidoka, Muda
app.use('/api/operations', operationsRoutes);

// Legal Module: IP Airlock, Vesting
app.use('/api/legal', legalRoutes);

// Finance Module: Ledger, Unit Economics
app.use('/api/finance', financeRoutes);

// Strategy Module: MECE Issue Trees, 7S Diagnostic
app.use('/api/strategy', strategyRoutes);

// Data Analytics Module: ETL, North Star Dashboard
app.use('/api/data', dataRoutes);

// Human Capital Module: Topgrading, Radical Candor
app.use('/api/human-capital', humanCapitalRoutes);

// Webhooks: GitHub, Slack (Integration Layer)
app.use('/api/webhooks', webhookRoutes);

// ═══════════════════════════════════════════════════════════════════
// ALGORITHMIC ENTERPRISE ROUTES
// ═══════════════════════════════════════════════════════════════════

// Digital Twin (DTO): Event Sourcing, Process Mining, Andon
app.use('/api/dto', dtoRoutes);

// Prediction Markets: CPMM Trading, Oracle Resolution
app.use('/api/markets', marketsRoutes);

// Quadratic Voting: Voice Credits, Preference Aggregation
app.use('/api/governance/voting', governanceRoutes);

// Zero-Based Budgeting: AI Agents, Zombie Hunting
app.use('/api/finance/zbb', zbbRoutes);

// Policy-as-Code: Compliance Evaluation
app.use('/api/compliance', complianceRoutes);

// ═══════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════

app.use(errorHandler);

// ═══════════════════════════════════════════════════════════════════
// SERVER START
// ═══════════════════════════════════════════════════════════════════

const PORT = config.port;

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   ██╗   ██╗███████╗██████╗  ██████╗ ███████╗ ██████╗ █████╗ ██╗   ║
║   ██║   ██║██╔════╝██╔══██╗██╔═══██╗██╔════╝██╔════╝██╔══██╗██║   ║
║   ██║   ██║█████╗  ██████╔╝██║   ██║███████╗██║     ███████║██║   ║
║   ╚██╗ ██╔╝██╔══╝  ██╔══██╗██║   ██║╚════██║██║     ██╔══██║██║   ║
║    ╚████╔╝ ███████╗██║  ██║╚██████╔╝███████║╚██████╗██║  ██║███████╗
║     ╚═══╝  ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝
║                                                                   ║
║   Enterprise Operating System for Algorithmic Leadership          ║
║   Mode: ${config.nodeEnv.toUpperCase().padEnd(12)} Port: ${String(PORT).padEnd(24)}║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
});

export { app };
