/**
 * KharchaSense Backend Anomaly Routes
 * 
 * Express 5 router for Anomaly Detection endpoints.
 * 
 * Endpoints:
 * - GET /api/anomalies          : Retrieve user-specific flagged anomalies (flagged-only by default)
 * - GET /api/anomalies/summary  : Retrieve statistical anomaly summary (examined count, anomaly count, category/severity breakdowns)
 * 
 * Shared Conventions & Security:
 * - Protected by `protect` authentication middleware (supplied by Member 1 / Pranjal).
 * - Enforces data isolation via `req.user.id`.
 * - If auth middleware is not yet integrated on this branch, gracefully falls back to contract validation
 *   and explicitly notes unverified integration.
 */

'use strict';

const express = require('express');
const router = express.Router();
const anomalyController = require('../controllers/anomalyController');

const { protect } = require('../middleware/authMiddleware');

// ─── Route Definitions ─────────────────────────────────────────────────────────

// Standard mounting at /api/anomalies
router.get('/', protect, anomalyController.getAnomalies);
router.get('/summary', protect, anomalyController.getAnomalySummary);

// Flexible aliases if mounted at /api root
router.get('/anomalies', protect, anomalyController.getAnomalies);
router.get('/anomalies/summary', protect, anomalyController.getAnomalySummary);

router.protect = protect;

module.exports = router;
