/**
 * Operations Module Routes
 * Heijunka (Production Leveling) & Jidoka (Andon) endpoints
 */

import { Router } from 'express';
import { z } from 'zod';
import { heijunkaService } from './services/heijunka.service';
import { andonService } from './services/andon.service';
import { errors } from '../../shared/middleware/error-handler';
import { prisma } from '../../config/database';
import type { PitchStatus, AndonStatus } from '@prisma/client';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// HEIJUNKA ENDPOINTS (Production Leveling)
// ═══════════════════════════════════════════════════════════════════

// Get velocity metrics
router.get('/velocity/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const metrics = await heijunkaService.calculateRollingVelocity(organizationId);
        res.json({ success: true, data: metrics });
    } catch (error) {
        next(error);
    }
});

// List pitches
router.get('/pitches/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const { status } = req.query;

        const pitches = await prisma.productionPitch.findMany({
            where: {
                organizationId,
                ...(status && { status: status as PitchStatus }),
            },
            orderBy: { startTime: 'desc' },
            include: {
                tasks: {
                    select: {
                        id: true,
                        title: true,
                        taskType: true,
                        storyPoints: true,
                        status: true,
                    },
                },
            },
        });

        res.json({ success: true, data: pitches });
    } catch (error) {
        next(error);
    }
});

// Create pitch
const createPitchSchema = z.object({
    organizationId: z.string().uuid(),
    name: z.string().min(1),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    capacityOverride: z.number().int().positive().optional(),
    demandUnitsExpected: z.number().int().positive().optional(),
});

router.post('/pitches', async (req, res, next) => {
    try {
        const input = createPitchSchema.parse(req.body);
        const pitch = await heijunkaService.createPitch({
            ...input,
            startTime: new Date(input.startTime),
            endTime: new Date(input.endTime),
        });
        res.status(201).json({ success: true, data: pitch });
    } catch (error) {
        next(error);
    }
});

// Lock pitch
router.patch('/pitches/:pitchId/lock', async (req, res, next) => {
    try {
        const { pitchId } = req.params;
        const pitch = await heijunkaService.lockPitch(pitchId);
        res.json({ success: true, data: pitch });
    } catch (error) {
        next(error);
    }
});

// Complete pitch
router.patch('/pitches/:pitchId/complete', async (req, res, next) => {
    try {
        const { pitchId } = req.params;
        const pitch = await heijunkaService.completePitch(pitchId);
        res.json({ success: true, data: pitch });
    } catch (error) {
        next(error);
    }
});

// Optimize Backlog Priorities (QV Link)
router.post('/optimize-priorities', async (req, res, next) => {
    try {
        const { organizationId } = req.body;
        if (!organizationId) throw new Error('Organization ID required');

        await heijunkaService.optimizeBacklogPriorities(organizationId);
        res.json({ success: true, message: 'Backlog priorities optimized based on QV results' });
    } catch (error) {
        next(error);
    }
});

// Analyze product mix
router.get('/pitches/:pitchId/mix', async (req, res, next) => {
    try {
        const { pitchId } = req.params;
        const { organizationId } = req.query;

        if (!organizationId || typeof organizationId !== 'string') {
            throw errors.badRequest('organizationId query parameter required');
        }

        const analysis = await heijunkaService.analyzeProductMix(organizationId, pitchId);
        res.json({ success: true, data: analysis });
    } catch (error) {
        next(error);
    }
});

// Assign task to pitch
const assignTaskSchema = z.object({
    taskId: z.string().uuid(),
    pitchId: z.string().uuid(),
    force: z.boolean().optional().default(false),
});

router.post('/tasks/assign', async (req, res, next) => {
    try {
        const { taskId, pitchId, force } = assignTaskSchema.parse(req.body);
        const result = await heijunkaService.assignTaskToPitch(taskId, pitchId, force);

        if (!result.success) {
            res.status(422).json(result);
            return;
        }

        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

// ═══════════════════════════════════════════════════════════════════
// ANDON ENDPOINTS (Jidoka - Stop the Line)
// ═══════════════════════════════════════════════════════════════════

// Get system health
router.get('/health/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const health = await andonService.getSystemHealth(organizationId);
        res.json({ success: true, data: health });
    } catch (error) {
        next(error);
    }
});

// Get MTTR metrics
router.get('/mttr/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const metrics = await andonService.getMTTRMetrics(organizationId);
        res.json({ success: true, data: metrics });
    } catch (error) {
        next(error);
    }
});

// List Andon events
router.get('/andon/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const { status, limit } = req.query;

        const events = await prisma.andonEvent.findMany({
            where: {
                organizationId,
                ...(status && { status: status as AndonStatus }),
            },
            orderBy: { createdAt: 'desc' },
            take: limit ? parseInt(limit as string) : 20,
            include: {
                claimedBy: { select: { id: true, name: true } },
                resolvedBy: { select: { id: true, name: true } },
            },
        });

        res.json({ success: true, data: events });
    } catch (error) {
        next(error);
    }
});

// Trigger manual Andon
const triggerAndonSchema = z.object({
    organizationId: z.string().uuid(),
    source: z.enum(['USER_MANUAL', 'MONITORING_ALERT']),
    severity: z.enum(['WARNING', 'STOP_LINE']).optional(),
    errorLog: z.string().optional(),
});

router.post('/andon/trigger', async (req, res, next) => {
    try {
        const input = triggerAndonSchema.parse(req.body);
        const event = await andonService.triggerAndon(input.organizationId, input);
        res.status(201).json({ success: true, data: event });
    } catch (error) {
        next(error);
    }
});

// Claim incident (start swarming)
const claimSchema = z.object({
    userId: z.string().uuid(),
    swarmChannelId: z.string().optional(),
});

router.patch('/andon/:eventId/claim', async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { userId, swarmChannelId } = claimSchema.parse(req.body);
        const event = await andonService.claimIncident(eventId, userId, swarmChannelId);
        res.json({ success: true, data: event });
    } catch (error) {
        next(error);
    }
});

// Resolve incident
const resolveSchema = z.object({
    resolverId: z.string().uuid(),
    rootCause: z.string().min(10),
    preventionAction: z.string().optional(),
});

router.patch('/andon/:eventId/resolve', async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const payload = resolveSchema.parse(req.body);
        const event = await andonService.resolveAndon(eventId, payload);
        res.json({ success: true, data: event });
    } catch (error) {
        next(error);
    }
});

// ═══════════════════════════════════════════════════════════════════
// MUDA ENDPOINTS (7 Wastes Visualization)
// ═══════════════════════════════════════════════════════════════════

import { mudaService } from './services/muda.service';

// Get comprehensive Muda overview
router.get('/muda/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const overview = await mudaService.getMudaOverview(organizationId);
        res.json({ success: true, data: overview });
    } catch (error) {
        next(error);
    }
});

// Get waiting time metrics
router.get('/muda/:organizationId/waiting', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const metrics = await mudaService.calculateWaitingTime(organizationId);
        res.json({ success: true, data: metrics });
    } catch (error) {
        next(error);
    }
});

// Get WIP inventory valuation
router.get('/muda/:organizationId/wip', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const metrics = await mudaService.calculateWipInventory(organizationId);
        res.json({ success: true, data: metrics });
    } catch (error) {
        next(error);
    }
});

// Get context switching metrics
router.get('/muda/:organizationId/switching', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const metrics = await mudaService.calculateContextSwitching(organizationId);
        res.json({ success: true, data: metrics });
    } catch (error) {
        next(error);
    }
});

// Get overproduction/stale flags
router.get('/muda/:organizationId/overproduction', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const metrics = await mudaService.detectOverproduction(organizationId);
        res.json({ success: true, data: metrics });
    } catch (error) {
        next(error);
    }
});

export { router as operationsRoutes };
