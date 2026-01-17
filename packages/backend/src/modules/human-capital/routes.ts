/**
 * Human Capital Module Routes
 * Topgrading & Radical Candor endpoints
 */

import { Router } from 'express';
import { z } from 'zod';
import { topgradingService } from './services/topgrading.service';
import { radicalCandorService } from './services/radical-candor.service';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// TOPGRADING ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// Create scorecard
const createScorecardSchema = z.object({
    organizationId: z.string().uuid(),
    title: z.string().min(1),
    department: z.string().optional(),
    outcomes: z.array(z.string()),
    competencies: z.array(z.string()),
});

router.post('/topgrading/scorecards', async (req, res, next) => {
    try {
        const input = createScorecardSchema.parse(req.body);
        const scorecard = await topgradingService.createScorecard(input);
        res.status(201).json({ success: true, data: scorecard });
    } catch (error) {
        next(error);
    }
});

// Get scorecards
router.get('/topgrading/scorecards/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const scorecards = await topgradingService.getScorecards(organizationId);
        res.json({ success: true, data: scorecards });
    } catch (error) {
        next(error);
    }
});

// Update scorecard
router.patch('/topgrading/scorecards/:scorecardId', async (req, res, next) => {
    try {
        const { scorecardId } = req.params;
        const updates = req.body;
        const scorecard = await topgradingService.updateScorecard(scorecardId, updates);
        res.json({ success: true, data: scorecard });
    } catch (error) {
        next(error);
    }
});

// Generate interview guide
router.get('/topgrading/scorecards/:scorecardId/interview-guide', async (req, res, next) => {
    try {
        const { scorecardId } = req.params;
        const scorecard = await topgradingService.getScorecards(scorecardId);
        if (!scorecard || scorecard.length === 0) {
            res.status(404).json({ success: false, error: 'Scorecard not found' });
            return;
        }
        const guide = topgradingService.generateInterviewGuide(scorecard[0]);
        res.json({ success: true, data: guide });
    } catch (error) {
        next(error);
    }
});

// Create candidate evaluation
const createEvalSchema = z.object({
    scorecardId: z.string().uuid(),
    candidateName: z.string().min(1),
    candidateEmail: z.string().email().optional(),
    jobHistory: z.array(z.object({
        company: z.string(),
        role: z.string(),
        tenure: z.number(),
        bossRating: z.number().min(1).max(10).optional(),
        reasonForLeaving: z.string().optional(),
        accomplishments: z.array(z.string()).optional(),
    })).optional(),
});

router.post('/topgrading/evaluations', async (req, res, next) => {
    try {
        const input = createEvalSchema.parse(req.body);
        const evaluation = await topgradingService.createEvaluation(input);
        res.status(201).json({ success: true, data: evaluation });
    } catch (error) {
        next(error);
    }
});

// Get evaluations for scorecard
router.get('/topgrading/evaluations/:scorecardId', async (req, res, next) => {
    try {
        const { scorecardId } = req.params;
        const { status } = req.query;
        const evaluations = await topgradingService.getEvaluations(
            scorecardId,
            status as any
        );
        res.json({ success: true, data: evaluations });
    } catch (error) {
        next(error);
    }
});

// Update evaluation
router.patch('/topgrading/evaluations/:evaluationId', async (req, res, next) => {
    try {
        const { evaluationId } = req.params;
        const updates = req.body;
        const evaluation = await topgradingService.updateEvaluation(evaluationId, updates);
        res.json({ success: true, data: evaluation });
    } catch (error) {
        next(error);
    }
});

// Analyze job history patterns
router.post('/topgrading/analyze-patterns', async (req, res, next) => {
    try {
        const { jobHistory } = req.body;
        const analysis = topgradingService.analyzePatterns(jobHistory);
        res.json({ success: true, data: analysis });
    } catch (error) {
        next(error);
    }
});

// Get pipeline summary
router.get('/topgrading/pipeline/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const summary = await topgradingService.getPipelineSummary(organizationId);
        res.json({ success: true, data: summary });
    } catch (error) {
        next(error);
    }
});

// ═══════════════════════════════════════════════════════════════════
// RADICAL CANDOR ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// Create feedback
const createFeedbackSchema = z.object({
    organizationId: z.string().uuid(),
    giverId: z.string().uuid(),
    recipientId: z.string().uuid(),
    content: z.string().min(1),
    feedbackType: z.enum(['PRAISE', 'CONSTRUCTIVE', 'PERFORMANCE_REVIEW', 'ONE_ON_ONE']),
    isDraft: z.boolean().optional(),
});

router.post('/feedback', async (req, res, next) => {
    try {
        const input = createFeedbackSchema.parse(req.body);
        const feedback = await radicalCandorService.createFeedback(input);
        res.status(201).json({ success: true, data: feedback });
    } catch (error) {
        next(error);
    }
});

// Send feedback (finalize draft)
router.post('/feedback/:feedbackId/send', async (req, res, next) => {
    try {
        const { feedbackId } = req.params;
        const feedback = await radicalCandorService.sendFeedback(feedbackId);
        res.json({ success: true, data: feedback });
    } catch (error) {
        next(error);
    }
});

// Analyze sentiment (preview)
router.post('/feedback/analyze', async (req, res, next) => {
    try {
        const { content } = req.body;
        const analysis = radicalCandorService.analyzeSentiment(content);
        res.json({ success: true, data: analysis });
    } catch (error) {
        next(error);
    }
});

// Get feedback given (private to giver)
router.get('/feedback/given/:giverId', async (req, res, next) => {
    try {
        const { giverId } = req.params;
        const feedback = await radicalCandorService.getGivenFeedback(giverId);
        res.json({ success: true, data: feedback });
    } catch (error) {
        next(error);
    }
});

// Get feedback received (content only, no analysis)
router.get('/feedback/received/:recipientId', async (req, res, next) => {
    try {
        const { recipientId } = req.params;
        const feedback = await radicalCandorService.getReceivedFeedback(recipientId);
        res.json({ success: true, data: feedback });
    } catch (error) {
        next(error);
    }
});

// Get personal stats (private to user)
router.get('/feedback/stats/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;
        const stats = await radicalCandorService.getPersonalStats(userId);
        res.json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
});

// Get org health metrics (anonymized)
router.get('/feedback/health/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const metrics = await radicalCandorService.getOrgHealthMetrics(organizationId);
        const matrix = radicalCandorService.getCandorMatrixData(metrics);
        res.json({ success: true, data: { metrics, matrix } });
    } catch (error) {
        next(error);
    }
});

export { router as humanCapitalRoutes };
