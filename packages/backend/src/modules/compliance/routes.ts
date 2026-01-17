/**
 * Policy Compliance API Routes
 * Policy-as-Code Evaluation Endpoints
 */

import { Router, Request, Response } from 'express';
import { complianceGate, policyEngine } from './services/policy-engine.service';
import { PolicyType } from './services/policy-engine.service';

const router = Router();

// Middleware to extract organizationId (mock for now if not in auth)
const getOrgId = (req: Request): string => {
    return (req.headers['x-organization-id'] as string) || (req.query.organizationId as string) || (req.body.organizationId as string) || 'org-1';
};

// ═══════════════════════════════════════════════════════════════════
// POLICY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/compliance/policies
 * List all policies
 */
router.get('/policies', async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const policies = await policyEngine.getPolicies(orgId);

        res.json({
            success: true,
            data: policies,
            count: policies.length,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list policies',
        });
    }
});

/**
 * GET /api/compliance/policies/:type
 * Get a specific policy by type
 */
router.get('/policies/:type', async (req: Request, res: Response) => {
    try {
        const { type } = req.params;
        const orgId = getOrgId(req);

        // Service doesn't expose getPolicy(type) directly publicly, so we filter full list
        // or we could add public getPolicy. For now, filter.
        const policies = await policyEngine.getPolicies(orgId);
        const policy = policies.find(p => p.type === type);

        if (!policy) {
            res.status(404).json({
                success: false,
                error: `Policy type '${type}' not found`,
            });
            return;
        }

        res.json({
            success: true,
            data: policy,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get policy',
        });
    }
});

/**
 * PATCH /api/compliance/policies/:type/toggle
 * Enable or disable a policy
 */
router.patch('/policies/:type/toggle', async (req: Request, res: Response) => {
    try {
        const { type } = req.params;
        const { enabled } = req.body;
        const orgId = getOrgId(req);

        await policyEngine.togglePolicy(orgId, type as PolicyType, enabled);

        res.json({
            success: true,
            message: `Policy ${type} is now ${enabled ? 'enabled' : 'disabled'}`,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to toggle policy',
        });
    }
});

/**
 * PUT /api/compliance/policies/:type
 * Update policy rules
 */
router.put('/policies/:type', async (req: Request, res: Response) => {
    try {
        const { type } = req.params;
        const { rules } = req.body;
        const orgId = getOrgId(req);

        if (!Array.isArray(rules)) throw new Error('Rules must be an array');

        const updated = await policyEngine.updatePolicyRules(orgId, type as any, rules);

        res.json({
            success: true,
            data: updated,
            message: `Policy ${type} updated with ${rules.length} rules`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update policy'
        });
    }
});

// ═══════════════════════════════════════════════════════════════════
// EVALUATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/compliance/evaluate/commit
 * Evaluate a Git commit for compliance
 */
router.post('/evaluate/commit', async (req: Request, res: Response) => {
    try {
        const { sha, message, author, files, approvers, timestamp } = req.body;
        const orgId = getOrgId(req);

        const result = await complianceGate.evaluateCommit(orgId, {
            sha,
            message,
            author,
            files: files || [],
            approvers: approvers || [],
            timestamp: new Date(timestamp || Date.now()),
        });

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Commit evaluation failed',
        });
    }
});

/**
 * POST /api/compliance/evaluate/deployment
 * Evaluate a deployment request
 */
router.post('/evaluate/deployment', async (req: Request, res: Response) => {
    try {
        const { environment, ciStatus, testCoverage, securityScanStatus, approvers } = req.body;
        const orgId = getOrgId(req);

        const result = await complianceGate.evaluateDeployment(orgId, {
            environment,
            ciStatus,
            testCoverage,
            securityScanStatus,
            approvers: approvers || [],
        });

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Deployment evaluation failed',
        });
    }
});

/**
 * POST /api/compliance/evaluate/data-access
 * Evaluate a data access request
 */
router.post('/evaluate/data-access', async (req: Request, res: Response) => {
    try {
        const { requestedOrgId, userOrgId, userRole, containsPII, justification } = req.body;
        const orgId = getOrgId(req);

        const result = await complianceGate.evaluateDataAccess(orgId, {
            requestedOrgId,
            userOrgId,
            userRole,
            containsPII,
            justification,
        });

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Data access evaluation failed',
        });
    }
});

/**
 * POST /api/compliance/evaluate/budget
 * Evaluate a budget request
 */
router.post('/evaluate/budget', async (req: Request, res: Response) => {
    try {
        const { amount, requestedAmount, departmentBudgetRemaining, approvers } = req.body;
        const orgId = getOrgId(req);

        // API might send different payload structure, adapting:
        const requestAmount = amount || requestedAmount || 0;

        const result = await complianceGate.evaluateBudget(orgId, {
            amount: requestAmount,
            requestedAmount: requestAmount,
            departmentBudgetRemaining,
            approvers: approvers || [],
        });

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Budget evaluation failed',
        });
    }
});

// ═══════════════════════════════════════════════════════════════════
// METRICS
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/compliance/metrics
 * Get compliance dashboard metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const metrics = await complianceGate.getComplianceMetrics(orgId);

        res.json({
            success: true,
            data: metrics,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get metrics',
        });
    }
});

export default router;
