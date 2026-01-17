/**
 * Webhook Routes - External Integration Handlers
 * GitHub, DocuSign, and other webhook endpoints
 */

import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { andonService } from '../../modules/operations/services/andon.service';
import { ipAirlockService } from '../../modules/legal/services/ip-airlock.service';
import { config } from '../../config/environment';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// GITHUB WEBHOOKS (for Andon/Jidoka)
// ═══════════════════════════════════════════════════════════════════

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(payload: string, signature: string): boolean {
    if (!config.github.webhookSecret) {
        console.warn('GitHub webhook secret not configured - skipping verification');
        return true; // Allow in dev without secret
    }

    const hmac = crypto.createHmac('sha256', config.github.webhookSecret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(digest)
    );
}

// GitHub workflow run webhook
router.post('/github/workflow', async (req, res, next) => {
    try {
        const signature = req.headers['x-hub-signature-256'] as string;
        const event = req.headers['x-github-event'] as string;

        // Verify signature
        if (signature && !verifyGitHubSignature(JSON.stringify(req.body), signature)) {
            res.status(401).json({ error: 'Invalid signature' });
            return;
        }

        // Only process workflow_run events
        if (event !== 'workflow_run') {
            res.json({ message: 'Event ignored' });
            return;
        }

        const { action, workflow_run } = req.body;

        // Only trigger Andon on failure
        if (action === 'completed' && workflow_run.conclusion === 'failure') {
            // Get organization ID from custom header or body
            const organizationId = req.headers['x-veroscale-org'] as string;

            if (!organizationId) {
                res.status(400).json({ error: 'Missing x-veroscale-org header' });
                return;
            }

            await andonService.handleGitHubWorkflowFailure(organizationId, {
                commitHash: workflow_run.head_sha,
                commitAuthor: workflow_run.actor?.login || 'unknown',
                branchName: workflow_run.head_branch,
                workflowUrl: workflow_run.html_url,
                errorMessage: `Workflow "${workflow_run.name}" failed`,
            });

            res.json({ message: 'Andon triggered', eventId: workflow_run.id });
            return;
        }

        res.json({ message: 'No action taken' });
    } catch (error) {
        next(error);
    }
});

// GitHub check run (for coverage)
router.post('/github/check-run', async (req, res, next) => {
    try {
        const signature = req.headers['x-hub-signature-256'] as string;

        if (signature && !verifyGitHubSignature(JSON.stringify(req.body), signature)) {
            res.status(401).json({ error: 'Invalid signature' });
            return;
        }

        const { action, check_run } = req.body;
        const organizationId = req.headers['x-veroscale-org'] as string;

        if (!organizationId) {
            res.status(400).json({ error: 'Missing x-veroscale-org header' });
            return;
        }

        // Look for coverage in check run output
        if (action === 'completed' && check_run.output?.text) {
            const coverageMatch = check_run.output.text.match(/Coverage:\s*(\d+(?:\.\d+)?)/i);

            if (coverageMatch) {
                const coverage = parseFloat(coverageMatch[1]!);

                const event = await andonService.handleCoverageDrop(organizationId, {
                    coveragePercent: coverage,
                    commitHash: check_run.head_sha,
                    commitAuthor: check_run.app?.owner?.login || 'unknown',
                });

                if (event) {
                    res.json({ message: 'Coverage warning triggered', coverage });
                    return;
                }
            }
        }

        res.json({ message: 'No action taken' });
    } catch (error) {
        next(error);
    }
});

// ═══════════════════════════════════════════════════════════════════
// DOCUSIGN WEBHOOKS (for IP Airlock)
// ═══════════════════════════════════════════════════════════════════

const docusignWebhookSchema = z.object({
    event: z.string(),
    data: z.object({
        envelopeId: z.string(),
        status: z.string(),
    }),
});

router.post('/docusign', async (req, res, next) => {
    try {
        // In production, verify DocuSign signature
        // For now, just parse the payload

        const { event, data } = docusignWebhookSchema.parse(req.body);

        if (event === 'envelope-completed' || data.status === 'completed') {
            // Envelope was signed
            const documentUrl = `https://docusign.com/envelope/${data.envelopeId}`; // Placeholder

            await ipAirlockService.handleDocuSignWebhook(
                data.envelopeId,
                documentUrl
            );

            res.json({ message: 'Signature processed' });
            return;
        }

        res.json({ message: 'Event acknowledged' });
    } catch (error) {
        next(error);
    }
});

// ═══════════════════════════════════════════════════════════════════
// SLACK WEBHOOKS (for interactive messages)
// ═══════════════════════════════════════════════════════════════════

router.post('/slack/interactive', async (req, res, next) => {
    try {
        // Slack sends payload as form-urlencoded
        const payload = JSON.parse(req.body.payload || '{}');

        if (payload.type === 'block_actions') {
            const action = payload.actions?.[0];

            if (action?.action_id === 'claim_andon') {
                // TODO: Map Slack user to VeroScale user and call andonService.claimIncident(action.value, mappedUserId)
                const userId = payload.user.id;

                // For now, just acknowledge the claim
                res.json({
                    response_type: 'in_channel',
                    text: `<@${userId}> claimed the incident.`,
                });
                return;
            }
        }

        res.json({ message: 'Action acknowledged' });
    } catch (error) {
        next(error);
    }
});

export { router as webhookRoutes };
