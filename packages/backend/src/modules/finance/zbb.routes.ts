/**
 * Zero-Based Budgeting (ZBB) API Routes
 * AI Agents for Spend Optimization
 */

import { Router, Request, Response } from 'express';
import {
    zbbCoordinator,
    zombieHunter,
    costAttributionEngine
} from './services/zbb-agents.service';
import crypto from 'crypto';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// BUDGET REQUESTS
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/finance/zbb/requests
 * Submit a budget request for AI agent review
 */
// POST /api/finance/zbb/requests
router.post('/requests', async (req: Request, res: Response) => {
    try {
        const {
            organizationId,
            requesterId,
            category,
            vendor,
            amount,
            justification,
            historicalSpend,
            historicalROI,
            predictionMarketId,
        } = req.body;

        const result = await zbbCoordinator.processBudgetRequest({
            organizationId,
            requesterId,
            category,
            vendor,
            amount,
            justification,
            historicalSpend,
            historicalROI,
            // @ts-ignore
            predictionMarketId: predictionMarketId || null,
            updatedAt: new Date(),
        });

        res.status(201).json({
            success: true,
            data: {
                status: result.status,
                agentResponse: result.conversation,
                requiresHumanReview: result.requiresHumanReview,
                requestId: result.requestId,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process budget request',
        });
    }
});

// ═══════════════════════════════════════════════════════════════════
// ZOMBIE SPEND DETECTION
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/finance/zbb/zombies
 * Hunt for zombie spend (unused resources)
 */
router.get('/zombies', async (req: Request, res: Response) => {
    try {
        const organizationId = req.query.organizationId as string;

        const alerts = await zombieHunter.hunt(organizationId);
        const summary = zombieHunter.summarizeSavings(alerts);

        res.json({
            success: true,
            data: {
                alerts,
                summary,
            },
            meta: {
                scanTypes: ['SAAS_SEAT', 'CLOUD_RESOURCE', 'SUBSCRIPTION', 'LICENSE'],
                inactiveThreshold: '30 days',
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Zombie hunt failed',
        });
    }
});

// ═══════════════════════════════════════════════════════════════════
// COST ATTRIBUTION
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/finance/zbb/attribution/:customerId
 * Get cost attribution for a specific customer
 */
router.get('/attribution/:customerId', async (req: Request, res: Response) => {
    try {
        const { customerId } = req.params;
        const organizationId = req.query.organizationId as string;

        const attribution = await costAttributionEngine.calculateCustomerAttribution(
            organizationId,
            customerId
        );

        const recommendations = costAttributionEngine.generateRecommendations(attribution);

        res.json({
            success: true,
            data: {
                attribution,
                recommendations,
            },
            meta: {
                formula: 'Gross Margin = Revenue - Infrastructure Cost',
                marginThreshold: '70%',
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Attribution calculation failed',
        });
    }
});

/**
 * GET /api/finance/zbb/unprofitable
 * Find customers below margin threshold
 */
router.get('/unprofitable', async (req: Request, res: Response) => {
    try {
        const organizationId = req.query.organizationId as string;

        const unprofitable = await costAttributionEngine.findUnprofitableCustomers(organizationId);

        res.json({
            success: true,
            data: unprofitable,
            count: unprofitable.length,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to find unprofitable customers',
        });
    }
});

// ═══════════════════════════════════════════════════════════════════
// SPEND AUDIT
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/finance/zbb/audit
 * Run a full organizational spend audit
 */
router.post('/audit', async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.body;

        const auditResult = await zbbCoordinator.runSpendAudit(organizationId);

        res.json({
            success: true,
            data: auditResult,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Spend audit failed',
        });
    }
});

/**
 * GET /api/finance/zbb/dashboard
 * Get ZBB dashboard metrics
 */
router.get('/dashboard', async (req: Request, res: Response) => {
    try {
        const organizationId = req.query.organizationId as string;

        const metrics = await zbbCoordinator.getDashboardMetrics(organizationId);

        res.json({
            success: true,
            data: metrics,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get dashboard metrics',
        });
    }
});

export default router;
