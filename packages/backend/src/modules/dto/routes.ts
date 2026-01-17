/**
 * Digital Twin (DTO) API Routes
 * Event Sourcing & Process Mining Endpoints
 */

import { Router, Request, Response } from 'express';
import { digitalTwinService, EdgeTransition } from './services/digital-twin.service';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// EVENT SOURCING ROUTES
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/dto/events
 * Record a new activity event
 */
router.post('/events', async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.params;
        const { timestamp, actorId, actorType, duration, caseId, nodeType, metadata } = req.body;

        const event = await digitalTwinService.recordActivity(organizationId, {
            timestamp: new Date(timestamp),
            actorId,
            actorType,
            duration,
            caseId,
            nodeType,
            metadata: metadata || {},
        });

        res.status(201).json({
            success: true,
            data: event,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to record event',
        });
    }
});

/**
 * POST /api/dto/ingest/jira
 * Webhook for Jira events
 */
router.post('/ingest/jira', async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.query;
        if (!organizationId) throw new Error('Organization ID required');

        const result = await digitalTwinService.ingestJiraEvent(organizationId as string, req.body);

        res.status(200).json({ success: true, ignored: !result });
    } catch (error) {
        console.error('Jira Ingest Error:', error);
        res.status(500).json({ success: false, error: 'Failed to process Jira webhook' });
    }
});

/**
 * POST /api/dto/ingest/calendar
 * Webhook/Integration for Calendar events
 */
router.post('/ingest/calendar', async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.body;
        const result = await digitalTwinService.ingestCalendarEvent(organizationId, req.body);
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to process calendar event' });
    }
});

/**
 * POST /api/dto/ingest/github
 * Webhook for GitHub Push/PR events
 */
router.post('/ingest/github', async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.query;
        // Basic acknowledgement - would parse x-github-event in real impl
        res.status(200).json({ success: true, message: 'GitHub event received and queued for DTO' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to process GitHub webhook' });
    }
});

/**
 * GET /api/dto/cases/:caseId
 * Reconstruct a case from event history
 */
router.get('/cases/:caseId', async (req: Request, res: Response) => {
    try {
        const { caseId } = req.params;

        const caseTrace = await digitalTwinService.reconstructCase(caseId);

        res.json({
            success: true,
            data: caseTrace,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error instanceof Error ? error.message : 'Case not found',
        });
    }
});

// ═══════════════════════════════════════════════════════════════════
// PROCESS MINING ROUTES
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/dto/flow-metrics
 * Calculate MBPM flow metrics for a value stream
 */
router.get('/flow-metrics', async (req: Request, res: Response) => {
    try {
        const organizationId = req.query.organizationId as string;
        const processType = req.query.processType as string || 'GENERAL';
        const startDate = new Date(req.query.startDate as string || Date.now() - 7 * 24 * 60 * 60 * 1000);
        const endDate = new Date(req.query.endDate as string || Date.now());

        const metrics = await digitalTwinService.calculateFlowMetrics(
            organizationId,
            processType,
            startDate,
            endDate
        );

        res.json({
            success: true,
            data: metrics,
            meta: {
                formula: 'Flow Efficiency = Σ Process Time / Σ Lead Time × 100',
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to calculate metrics',
        });
    }
});

/**
 * GET /api/dto/process-graph
 * Mine process transitions to build the process graph
 */
router.get('/process-graph', async (req: Request, res: Response) => {
    try {
        const organizationId = req.query.organizationId as string;
        const processType = req.query.processType as string || 'GENERAL';

        const transitions = await digitalTwinService.mineProcessGraph(organizationId, processType);

        res.json({
            success: true,
            data: {
                transitions,
                nodeCount: new Set(transitions.flatMap((t: EdgeTransition) => [t.sourceNode, t.targetNode])).size,
                edgeCount: transitions.length,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to mine process graph',
        });
    }
});

// ═══════════════════════════════════════════════════════════════════
// ANDON CORD ROUTES
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/dto/andon/evaluate
 * Evaluate andon conditions for a process type
 */
router.get('/andon/evaluate', async (req: Request, res: Response) => {
    try {
        const organizationId = req.query.organizationId as string;
        const processType = req.query.processType as string || 'GENERAL';

        const andonEvent = await digitalTwinService.evaluateAndonConditions(organizationId, processType);

        res.json({
            success: true,
            data: {
                triggered: andonEvent !== null,
                event: andonEvent,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to evaluate andon conditions',
        });
    }
});

/**
 * GET /api/dto/queues
 * Get queue buffer status for WIP limit monitoring
 */
router.get('/queues', async (req: Request, res: Response) => {
    try {
        const organizationId = req.query.organizationId as string;

        const queues = await digitalTwinService.getQueueStatus(organizationId);

        res.json({
            success: true,
            data: queues,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get queue status',
        });
    }
});

export default router;
