/**
 * Strategy Module Routes
 * MECE Issue Trees & McKinsey 7S Diagnostic endpoints
 */

import { Router } from 'express';
import { z } from 'zod';
import { issueTreeService } from './services/issue-tree.service';
import { sevenSService } from './services/seven-s.service';
import { analyticsService } from './services/analytics.service';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// NORTH STAR METRIC
// ═══════════════════════════════════════════════════════════════════

router.get('/north-star', async (req, res, next) => {
    try {
        const organizationId = req.query.organizationId as string;
        if (!organizationId) throw new Error('Organization ID required');

        const metric = await analyticsService.getNorthStarMetric(organizationId);
        res.json({ success: true, data: metric });
    } catch (error) {
        next(error);
    }
});

// ═══════════════════════════════════════════════════════════════════
// SIMULATION ENDPOINTS (Phase 9)
// ═══════════════════════════════════════════════════════════════════

import { simulationService } from './services/simulation.service';

router.post('/simulate', async (req, res, next) => {
    try {
        const { teamId, scope } = req.body;
        if (!teamId || !scope) throw new Error('Team ID and Scope required');

        const result = await simulationService.runSimulation(scope, teamId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

// ═══════════════════════════════════════════════════════════════════
// ISSUE TREE ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// Create tree
const createTreeSchema = z.object({
    organizationId: z.string().uuid(),
    title: z.string().min(1),
    rootQuestion: z.string().min(1),
    treeType: z.enum(['ISSUE', 'HYPOTHESIS', 'OPTION']).optional(),
    aiSuggestionsEnabled: z.boolean().optional(),
});

router.post('/issue-trees', async (req, res, next) => {
    try {
        const input = createTreeSchema.parse(req.body);
        const tree = await issueTreeService.createTree(input);
        res.status(201).json({ success: true, data: tree });
    } catch (error) {
        next(error);
    }
});

// Get trees for org
router.get('/issue-trees/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const trees = await issueTreeService.getTreesForOrg(organizationId);
        res.json({ success: true, data: trees });
    } catch (error) {
        next(error);
    }
});

// Get tree with hierarchy
router.get('/issue-trees/:treeId/hierarchy', async (req, res, next) => {
    try {
        const { treeId } = req.params;
        const hierarchy = await issueTreeService.getTreeHierarchy(treeId);
        res.json({ success: true, data: hierarchy });
    } catch (error) {
        next(error);
    }
});

// Add node
const addNodeSchema = z.object({
    treeId: z.string().uuid(),
    parentId: z.string().uuid().optional(),
    label: z.string().min(1),
    hypothesis: z.string().optional(),
    notes: z.string().optional(),
    dataSourceType: z.enum(['UNIT_ECONOMICS', 'VELOCITY', 'REVENUE', 'CUSTOM_QUERY']).optional(),
    dataSourceQuery: z.string().optional(),
});

router.post('/issue-trees/nodes', async (req, res, next) => {
    try {
        const input = addNodeSchema.parse(req.body);
        const node = await issueTreeService.addNode(input);
        res.status(201).json({ success: true, data: node });
    } catch (error) {
        next(error);
    }
});

// Update node
router.patch('/issue-trees/nodes/:nodeId', async (req, res, next) => {
    try {
        const { nodeId } = req.params;
        const updates = req.body;
        const node = await issueTreeService.updateNode(nodeId, updates);
        res.json({ success: true, data: node });
    } catch (error) {
        next(error);
    }
});

// Delete node
router.delete('/issue-trees/nodes/:nodeId', async (req, res, next) => {
    try {
        const { nodeId } = req.params;
        await issueTreeService.deleteNode(nodeId);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Validate MECE
router.get('/issue-trees/nodes/:nodeId/validate', async (req, res, next) => {
    try {
        const { nodeId } = req.params;
        const validation = await issueTreeService.validateMece(nodeId);
        res.json({ success: true, data: validation });
    } catch (error) {
        next(error);
    }
});

// Refresh live data
router.post('/issue-trees/nodes/:nodeId/refresh', async (req, res, next) => {
    try {
        const { nodeId } = req.params;
        const { organizationId } = req.body;
        const node = await issueTreeService.refreshLiveData(nodeId, organizationId);
        res.json({ success: true, data: node });
    } catch (error) {
        next(error);
    }
});

// Delete tree
router.delete('/issue-trees/:treeId', async (req, res, next) => {
    try {
        const { treeId } = req.params;
        await issueTreeService.deleteTree(treeId);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// ═══════════════════════════════════════════════════════════════════
// 7S DIAGNOSTIC ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// Create diagnostic from survey
const surveySchema = z.object({
    organizationId: z.string().uuid(),
    responses: z.array(z.object({
        respondentId: z.string(),
        strategy: z.number().min(1).max(10),
        structure: z.number().min(1).max(10),
        systems: z.number().min(1).max(10),
        sharedValues: z.number().min(1).max(10),
        style: z.number().min(1).max(10),
        staff: z.number().min(1).max(10),
        skills: z.number().min(1).max(10),
        comments: z.record(z.string()).optional(),
    })),
    systemLinks: z.any().optional(),
});

router.post('/seven-s/diagnostics', async (req, res, next) => {
    try {
        const input = surveySchema.parse(req.body);
        const diagnostic = await sevenSService.createDiagnostic(input);
        res.status(201).json({ success: true, data: diagnostic });
    } catch (error) {
        next(error);
    }
});

// Get latest diagnostic
router.get('/seven-s/:organizationId/latest', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const diagnostic = await sevenSService.getLatest(organizationId);
        res.json({ success: true, data: diagnostic });
    } catch (error) {
        next(error);
    }
});

// Get diagnostic history
router.get('/seven-s/:organizationId/history', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const { limit } = req.query;
        const history = await sevenSService.getHistory(
            organizationId,
            limit ? parseInt(limit as string) : 12
        );
        res.json({ success: true, data: history });
    } catch (error) {
        next(error);
    }
});

// Get misalignment alerts
router.get('/seven-s/:organizationId/alerts', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const alerts = await sevenSService.getMisalignmentAlerts(organizationId);
        res.json({ success: true, data: alerts });
    } catch (error) {
        next(error);
    }
});

// Compare two diagnostics
router.get('/seven-s/compare', async (req, res, next) => {
    try {
        const { id1, id2 } = req.query;
        if (!id1 || !id2) {
            res.status(400).json({ success: false, error: 'Both id1 and id2 required' });
            return;
        }
        const comparison = await sevenSService.compareDiagnostics(id1 as string, id2 as string);
        res.json({ success: true, data: comparison });
    } catch (error) {
        next(error);
    }
});

export { router as strategyRoutes };
