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
 * - Protected by canonical `protect` authentication middleware (from ../middleware/authMiddleware).
 * - Enforces data isolation strictly via authenticated `req.user.id`.
 * - Never bypasses JWT verification based on req.user alone.
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
