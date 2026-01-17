/**
 * Data Analytics Module Routes
 * ETL Pipeline & North Star Dashboard endpoints
 */

import { Router } from 'express';
import { etlService } from './services/etl.service';
import { northStarService } from './services/north-star.service';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// ETL PIPELINE ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// Run ETL pipeline
router.post('/etl/run/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const result = await etlService.runPipeline(organizationId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

// Extract from specific source
router.get('/etl/extract/:organizationId/:source', async (req, res, next) => {
    try {
        const { organizationId, source } = req.params;
        const data = await etlService.extractInternal(organizationId, source);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

// ═══════════════════════════════════════════════════════════════════
// NORTH STAR DASHBOARD ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// Get dashboard data
router.get('/north-star/:organizationId', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const dashboard = await northStarService.getDashboardData(organizationId);
        res.json({ success: true, data: dashboard });
    } catch (error) {
        next(error);
    }
});

// Get metric values
router.get('/north-star/:organizationId/metrics', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const values = await northStarService.getMetricValues(organizationId);
        res.json({ success: true, data: values });
    } catch (error) {
        next(error);
    }
});

// Get metric configurations
router.get('/north-star/config/metrics', async (req, res, next) => {
    try {
        const metrics = northStarService.getMetrics();
        res.json({ success: true, data: metrics });
    } catch (error) {
        next(error);
    }
});

// Analyze correlations
router.get('/north-star/:organizationId/correlations', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const correlations = await northStarService.analyzeCorrelations(organizationId);
        res.json({ success: true, data: correlations });
    } catch (error) {
        next(error);
    }
});

// Predict metric
router.post('/north-star/:organizationId/predict', async (req, res, next) => {
    try {
        const { organizationId } = req.params;
        const { targetMetric, predictorMetrics } = req.body;
        const prediction = await northStarService.predictMetric(
            organizationId,
            targetMetric,
            predictorMetrics
        );
        res.json({ success: true, data: prediction });
    } catch (error) {
        next(error);
    }
});

export { router as dataRoutes };
