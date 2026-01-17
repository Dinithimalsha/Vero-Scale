/**
 * Quadratic Voting API Routes
 * Voice Credits & Preference Aggregation Endpoints
 */

import { Router, Request, Response } from 'express';
import { quadraticVotingService } from './services/quadratic-voting.service';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/governance/voting/sessions
 * Create a new voting session
 */
router.post('/sessions', async (req: Request, res: Response) => {
    try {
        const {
            organizationId,
            title,
            options,
            description,
            durationDays,
            creditsPerVoter,
        } = req.body;

        const session = await quadraticVotingService.createSession(
            organizationId,
            title,
            options,
            { description, durationDays, creditsPerVoter }
        );

        res.status(201).json({
            success: true,
            data: session,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create session',
        });
    }
});

/**
 * GET /api/governance/voting/sessions
 * List all voting sessions for an organization
 */
router.get('/sessions', async (req: Request, res: Response) => {
    try {
        const organizationId = req.query.organizationId as string;
        const status = req.query.status as 'OPEN' | 'CLOSED' | 'TALLIED' | undefined;

        const sessions = await quadraticVotingService.listSessions(organizationId, status);

        res.json({
            success: true,
            data: sessions,
            count: sessions.length,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list sessions',
        });
    }
});

/**
 * GET /api/governance/voting/sessions/:sessionId/results
 * Get current results of a voting session
 */
router.get('/sessions/:sessionId/results', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        const results = await quadraticVotingService.getSessionResults(sessionId);

        res.json({
            success: true,
            data: results,
            meta: {
                formula: 'Cost = N² (1 vote = 1 credit, 10 votes = 100 credits)',
            },
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error instanceof Error ? error.message : 'Session not found',
        });
    }
});

/**
 * POST /api/governance/voting/sessions/:sessionId/close
 * Close a session and finalize rankings
 */
router.post('/sessions/:sessionId/close', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        const results = await quadraticVotingService.closeSession(sessionId);

        res.json({
            success: true,
            message: 'Session closed and tallied',
            data: results,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to close session',
        });
    }
});

// ═══════════════════════════════════════════════════════════════════
// VOTING
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/governance/voting/sessions/:sessionId/vote
 * Submit a ballot (vote allocation)
 */
router.post('/sessions/:sessionId/vote', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { voterId, votes } = req.body;

        const ballot = await quadraticVotingService.submitBallot(sessionId, voterId, votes);

        res.status(201).json({
            success: true,
            data: ballot,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Vote submission failed',
        });
    }
});

/**
 * GET /api/governance/voting/sessions/:sessionId/voter/:voterId
 * Get voter's status (has voted, remaining credits)
 */
router.get('/sessions/:sessionId/voter/:voterId', async (req: Request, res: Response) => {
    try {
        const { sessionId, voterId } = req.params;

        const status = await quadraticVotingService.getVoterStatus(sessionId, voterId);

        res.json({
            success: true,
            data: status,
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error instanceof Error ? error.message : 'Session not found',
        });
    }
});

// ═══════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/governance/voting/preview-cost
 * Preview the cost of a ballot without submitting
 */
router.post('/preview-cost', async (req: Request, res: Response) => {
    try {
        const { initialCredits, votes } = req.body;

        const preview = quadraticVotingService.previewBallotCost(initialCredits || 1000, votes);

        res.json({
            success: true,
            data: preview,
            meta: {
                formula: 'Cost = N²',
                examples: [
                    { votes: 1, cost: 1 },
                    { votes: 5, cost: 25 },
                    { votes: 10, cost: 100 },
                    { votes: 31, cost: 961, note: 'Max with 1000 credits' },
                ],
            },
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Preview failed',
        });
    }
});

export default router;
