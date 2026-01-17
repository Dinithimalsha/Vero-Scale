/**
 * Finance Module Routes
 * Unit Economics & Financial Health endpoints
 */

import { Router } from 'express';
import { z } from 'zod';
import { unitEconomicsService } from './services/unit-economics.service';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// UNIT ECONOMICS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// Calculate and store snapshot
const calculateSchema = z.object({
    organizationId: z.string().uuid(),
    date: z.string().datetime(),
    revenue: z.number().nonnegative(),
    activeCustomers: z.number().int().nonnegative(),
    newCustomers: z.number().int().nonnegative(),
    churnedCustomers: z.number().int().nonnegative(),
    salesMarketingExpense: z.number().nonnegative(),
    cogsTotal: z.number().nonnegative(),
    cashBalance: z.number(),
    monthlyBurnRate: z.number().nonnegative(),
});

router.post('/unit-economics/calculate', async (req, res, next) => {
    try {
        const input = calculateSchema.parse(req.body);
        const snapshot = await unitEconomicsService.calculateAndStore({
            ...input,
            date: new Date(input.date),
        });
        res.status(201).json({ success: true, data: snapshot });
    } catch (error) {
        next(error);
    }
});

// Get health gauge (LTV:CAC)
router.get('/unit-economics/health/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const health = await unitEconomicsService.getHealthGauge(organizationId);
        res.json({ success: true, data: health });
    } catch (error) {
        next(error);
    }
});

// Check insolvency risk
router.get('/unit-economics/insolvency-check/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const risk = await unitEconomicsService.checkInsolvencyRisk(organizationId);
        res.json({ success: true, data: risk });
    } catch (error) {
        next(error);
    }
});

// Get J-Curve data
router.get('/unit-economics/j-curve/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const { months } = req.query;
        const curve = await unitEconomicsService.getJCurveData(
            organizationId,
            months ? parseInt(months as string) : 24
        );
        res.json({ success: true, data: curve });
    } catch (error) {
        next(error);
    }
});

// Analyze Rule of 40
router.get('/unit-economics/rule-of-40/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const analysis = await unitEconomicsService.analyzeRuleOf40(organizationId);
        res.json({ success: true, data: analysis });
    } catch (error) {
        next(error);
    }
});

// Get historical trend
router.get('/unit-economics/trend/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const { days } = req.query;
        const trend = await unitEconomicsService.getHistoricalTrend(
            organizationId,
            days ? parseInt(days as string) : 30
        );
        res.json({ success: true, data: trend });
    } catch (error) {
        next(error);
    }
});

// Get latest snapshot
router.get('/unit-economics/latest/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const snapshot = await unitEconomicsService.getLatestSnapshot(organizationId);
        res.json({ success: true, data: snapshot });
    } catch (error) {
        next(error);
    }
});

// ═══════════════════════════════════════════════════════════════════
// LEDGER ENDPOINTS (Live Bank Feed & Transactions)
// ═══════════════════════════════════════════════════════════════════

import { ledgerService } from './services/ledger.service';

// Import Plaid transactions (webhook endpoint)
const plaidImportSchema = z.object({
    organizationId: z.string().uuid(),
    transactions: z.array(z.object({
        transaction_id: z.string(),
        account_id: z.string(),
        amount: z.number(),
        date: z.string(),
        name: z.string(),
        merchant_name: z.string().optional(),
        category: z.array(z.string()),
        pending: z.boolean(),
    })),
});

router.post('/ledger/import-plaid', async (req, res, next) => {
    try {
        const { organizationId, transactions } = plaidImportSchema.parse(req.body);
        const result = await ledgerService.importPlaidTransactions(organizationId, transactions);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

// Create manual transaction
const createTxSchema = z.object({
    organizationId: z.string().uuid(),
    date: z.string().datetime(),
    description: z.string(),
    amount: z.number(),
    currency: z.string().optional(),
    category: z.enum(['REVENUE', 'COGS', 'OPEX', 'PAYROLL', 'TAX', 'TRANSFER', 'OTHER']),
    subcategory: z.string().optional(),
    costType: z.enum(['COGS_HOSTING', 'COGS_SUPPORT', 'COGS_THIRD_PARTY', 'OPEX_MARKETING', 'OPEX_SALES', 'OPEX_RD', 'OPEX_GA']).optional(),
});

router.post('/ledger/transactions', async (req, res, next) => {
    try {
        const input = createTxSchema.parse(req.body);
        const tx = await ledgerService.createTransaction({
            ...input,
            date: new Date(input.date),
        });
        res.status(201).json({ success: true, data: tx });
    } catch (error) {
        next(error);
    }
});

// Get transactions with filters
router.get('/ledger/transactions/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const { startDate, endDate, category, costType, limit, offset } = req.query;
        const result = await ledgerService.getTransactions(organizationId, {
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            category: category as any,
            costType: costType as any,
            limit: limit ? parseInt(limit as string) : undefined,
            offset: offset ? parseInt(offset as string) : undefined,
        });
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

// Update transaction category
const updateCatSchema = z.object({
    category: z.enum(['REVENUE', 'COGS', 'OPEX', 'PAYROLL', 'TAX', 'TRANSFER', 'OTHER']),
    costType: z.enum(['COGS_HOSTING', 'COGS_SUPPORT', 'COGS_THIRD_PARTY', 'OPEX_MARKETING', 'OPEX_SALES', 'OPEX_RD', 'OPEX_GA']).optional(),
});

router.patch('/ledger/transactions/:transactionId/category', async (req, res, next) => {
    try {
        const { transactionId } = req.params;
        const { category, costType } = updateCatSchema.parse(req.body);
        const tx = await ledgerService.updateCategory(transactionId, category, costType);
        res.json({ success: true, data: tx });
    } catch (error) {
        next(error);
    }
});

// Calculate gross margin
router.get('/ledger/gross-margin/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const { startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate as string) : new Date();

        const margin = await ledgerService.calculateGrossMargin(organizationId, start, end);
        res.json({ success: true, data: margin });
    } catch (error) {
        next(error);
    }
});

// Get monthly breakdown
router.get('/ledger/monthly-breakdown/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const { months } = req.query;
        const breakdown = await ledgerService.getMonthlyBreakdown(
            organizationId,
            months ? parseInt(months as string) : 6
        );
        res.json({ success: true, data: breakdown });
    } catch (error) {
        next(error);
    }
});

// Auto-categorize (preview)
router.post('/ledger/categorize', async (req, res, next) => {
    try {
        const { description, amount } = req.body;
        const suggestion = ledgerService.categorizeTransaction(description, amount);
        res.json({ success: true, data: suggestion });
    } catch (error) {
        next(error);
    }
});

export { router as financeRoutes };
