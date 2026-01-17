/**
 * Prediction Markets API Routes
 * CPMM Binary Options Trading Endpoints
 */

import { Router, Request, Response } from 'express';
import { predictionMarketService, Outcome } from './services/prediction-market.service';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// MARKET MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/markets
 * Create a new prediction market
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const {
            organizationId,
            question,
            expiryTimestamp,
            description,
            oracleType,
            oracleSourceUrl,
            resolutionLogic,
            initialLiquidity,
        } = req.body;

        const market = await predictionMarketService.createMarket(
            organizationId,
            question,
            new Date(expiryTimestamp),
            {
                description,
                oracleType,
                oracleSourceUrl,
                resolutionLogic,
                initialLiquidity,
            }
        );

        res.status(201).json({
            success: true,
            data: market,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create market',
        });
    }
});

/**
 * GET /api/markets
 * List all markets for an organization
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const organizationId = req.query.organizationId as string;
        const status = req.query.status as 'OPEN' | 'CLOSED' | 'RESOLVED' | undefined;

        const markets = await predictionMarketService.listMarkets(organizationId, status);

        res.json({
            success: true,
            data: markets,
            count: markets.length,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list markets',
        });
    }
});

/**
 * GET /api/markets/:marketId/price
 * Get current market price (probability)
 */
router.get('/:marketId/price', async (req: Request, res: Response) => {
    try {
        const { marketId } = req.params;

        const price = await predictionMarketService.getMarketPrice(marketId);

        res.json({
            success: true,
            data: price,
            meta: {
                formula: 'P(YES) = NO_TOKENS / (YES_TOKENS + NO_TOKENS)',
                algorithm: 'Constant Product Market Maker (CPMM)',
            },
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error instanceof Error ? error.message : 'Market not found',
        });
    }
});

/**
 * GET /api/markets/:marketId/forecast
 * Get probability forecast for decision making
 */
router.get('/:marketId/forecast', async (req: Request, res: Response) => {
    try {
        const { marketId } = req.params;

        const forecast = await predictionMarketService.getProbabilityForecast(marketId);

        res.json({
            success: true,
            data: forecast,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error instanceof Error ? error.message : 'Market not found',
        });
    }
});

// ═══════════════════════════════════════════════════════════════════
// TRADING
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/markets/:marketId/trade
 * Execute a trade (buy shares)
 */
router.post('/:marketId/trade', async (req: Request, res: Response) => {
    try {
        const { marketId } = req.params;
        const { userId, outcome, usdAmount } = req.body;

        if (!['YES', 'NO'].includes(outcome)) {
            res.status(400).json({
                success: false,
                error: 'Outcome must be YES or NO',
            });
            return;
        }

        const trade = await predictionMarketService.buyShares(
            marketId,
            userId,
            outcome as Outcome,
            usdAmount
        );

        res.status(201).json({
            success: true,
            data: trade,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Trade failed',
        });
    }
});

/**
 * GET /api/markets/:marketId/position/:userId
 * Get user's position in a market
 */
router.get('/:marketId/position/:userId', async (req: Request, res: Response) => {
    try {
        const { marketId, userId } = req.params;

        const position = await predictionMarketService.getUserPosition(userId, marketId);

        res.json({
            success: true,
            data: position,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get position',
        });
    }
});

// ═══════════════════════════════════════════════════════════════════
// ORACLE & RESOLUTION
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/markets/:marketId/oracle
 * Check oracle conditions for resolution
 */
router.get('/:marketId/oracle', async (req: Request, res: Response) => {
    try {
        const { marketId } = req.params;

        const oracleStatus = await predictionMarketService.checkOracleConditions(marketId);

        res.json({
            success: true,
            data: oracleStatus,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error instanceof Error ? error.message : 'Market not found',
        });
    }
});

/**
 * POST /api/markets/:marketId/resolve
 * Resolve a market with an outcome
 */
router.post('/:marketId/resolve', async (req: Request, res: Response) => {
    try {
        const { marketId } = req.params;
        const { outcome } = req.body;

        if (!['YES', 'NO'].includes(outcome)) {
            res.status(400).json({
                success: false,
                error: 'Outcome must be YES or NO',
            });
            return;
        }

        await predictionMarketService.resolveMarket(marketId, outcome as Outcome);

        res.json({
            success: true,
            message: `Market resolved to ${outcome}. Positions settled.`,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Resolution failed',
        });
    }
});

export default router;
