/**
 * Legal Module Routes
 * IP Airlock & Equity Vesting endpoints
 */

import { Router } from 'express';
import { z } from 'zod';
import { ipAirlockService } from './services/ip-airlock.service';
import { vestingService } from './services/vesting.service';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// IP AIRLOCK ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// Check access permission
router.get('/ip-airlock/check/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;
        const access = await ipAirlockService.checkAccessPermission(userId);
        res.json({ success: true, data: access });
    } catch (error) {
        next(error);
    }
});

// Create agreement
const createAgreementSchema = z.object({
    userId: z.string().uuid(),
    organizationId: z.string().uuid(),
    documentType: z.enum(['PIIAA', 'NDA', 'CONTRACTOR_IP']).optional(),
    expirationDate: z.string().datetime().optional(),
});

router.post('/ip-airlock/agreements', async (req, res, next) => {
    try {
        const input = createAgreementSchema.parse(req.body);
        const agreement = await ipAirlockService.createAgreement({
            ...input,
            expirationDate: input.expirationDate ? new Date(input.expirationDate) : undefined,
        });
        res.status(201).json({ success: true, data: agreement });
    } catch (error) {
        next(error);
    }
});

// Get pending agreements
router.get('/ip-airlock/pending/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const agreements = await ipAirlockService.getPendingAgreements(organizationId);
        res.json({ success: true, data: agreements });
    } catch (error) {
        next(error);
    }
});

// Mark as signed (for testing - normally from DocuSign webhook)
router.patch('/ip-airlock/agreements/:agreementId/sign', async (req, res, next) => {
    try {
        const { agreementId } = req.params;
        const { documentUrl } = req.body;
        const agreement = await ipAirlockService.markAsSigned(agreementId, documentUrl || '');
        res.json({ success: true, data: agreement });
    } catch (error) {
        next(error);
    }
});

// Revoke agreement
router.delete('/ip-airlock/agreements/:agreementId', async (req, res, next) => {
    try {
        const { agreementId } = req.params;
        const agreement = await ipAirlockService.revokeAgreement(agreementId);
        res.json({ success: true, data: agreement });
    } catch (error) {
        next(error);
    }
});

// ═══════════════════════════════════════════════════════════════════
// VESTING ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// Get vesting alerts
router.get('/vesting/alerts/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const alerts = await vestingService.getUpcomingAlerts(organizationId);
        res.json({ success: true, data: alerts });
    } catch (error) {
        next(error);
    }
});

// Create grant
const createGrantSchema = z.object({
    userId: z.string().uuid(),
    organizationId: z.string().uuid(),
    grantType: z.enum(['ISO', 'NSO', 'RSA', 'RSU']).optional(),
    totalShares: z.number().int().positive(),
    strikePrice: z.number().nonnegative(),
    grantDate: z.string().datetime(),
    vestingMonths: z.number().int().positive().optional(),
    cliffMonths: z.number().int().positive().optional(),
    singleTriggerAccel: z.boolean().optional(),
    doubleTriggerAccel: z.boolean().optional(),
    accelerationPercent: z.number().int().min(0).max(100).optional(),
});

router.post('/vesting/grants', async (req, res, next) => {
    try {
        const input = createGrantSchema.parse(req.body);
        const grant = await vestingService.createGrant({
            ...input,
            grantDate: new Date(input.grantDate),
        });
        res.status(201).json({ success: true, data: grant });
    } catch (error) {
        next(error);
    }
});

// Get vesting snapshot
router.get('/vesting/grants/:grantId/snapshot', async (req, res, next) => {
    try {
        const { grantId } = req.params;
        const snapshot = await vestingService.getVestingSnapshot(grantId);
        res.json({ success: true, data: snapshot });
    } catch (error) {
        next(error);
    }
});

// Approve cliff
router.patch('/vesting/grants/:grantId/approve-cliff', async (req, res, next) => {
    try {
        const { grantId } = req.params;
        const { notes } = req.body;
        const grant = await vestingService.approveCliff(grantId, notes);
        res.json({ success: true, data: grant });
    } catch (error) {
        next(error);
    }
});

// Record 83(b) election
router.patch('/vesting/grants/:grantId/83b-filed', async (req, res, next) => {
    try {
        const { grantId } = req.params;
        const grant = await vestingService.record83bElection(grantId);
        res.json({ success: true, data: grant });
    } catch (error) {
        next(error);
    }
});

// Trigger acceleration
const accelerationSchema = z.object({
    triggerType: z.enum(['SINGLE', 'DOUBLE']),
});

router.patch('/vesting/grants/:grantId/accelerate', async (req, res, next) => {
    try {
        const { grantId } = req.params;
        const { triggerType } = accelerationSchema.parse(req.body);
        const grant = await vestingService.triggerAcceleration(grantId, triggerType);
        res.json({ success: true, data: grant });
    } catch (error) {
        next(error);
    }
});

// Terminate vesting
router.patch('/vesting/grants/:grantId/terminate', async (req, res, next) => {
    try {
        const { grantId } = req.params;
        const grant = await vestingService.terminateVesting(grantId);
        res.json({ success: true, data: grant });
    } catch (error) {
        next(error);
    }
});

export { router as legalRoutes };
