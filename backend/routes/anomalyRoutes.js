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

// In-flight dependency resolution:
// Resolves canonical `protect` authentication middleware from middlewares/
let protectMiddleware = null;

try {
  const authModule = require('../middlewares/authMiddleware');
  protectMiddleware = authModule.protect || authModule;
} catch (e1) {
  try {
    const authModule = require('../middlewares/auth');
    protectMiddleware = authModule.protect || authModule;
  } catch (e2) {
    // Auth middleware dependency not yet present on this branch.
    // Documented interface: req.user.id must be set by Pranjal's protect middleware.
  }
}

/**
 * Dynamic protect middleware handler.
 * Seamlessly delegates to Pranjal's protect middleware once integrated,
 * while safely validating req.user.id during tests or before integration.
 */
function protect(req, res, next) {
  if (typeof protectMiddleware === 'function') {
    return protectMiddleware(req, res, next);
  }

  // Attempt late runtime resolution
  try {
    const authModule = require('../middlewares/authMiddleware');
    protectMiddleware = authModule.protect || authModule;
    return protectMiddleware(req, res, next);
  } catch (_) {}

  try {
    const authModule = require('../middlewares/auth');
    protectMiddleware = authModule.protect || authModule;
    return protectMiddleware(req, res, next);
  } catch (_) {}

  // Fallback guard adhering strictly to the shared API contract
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Authorization token missing or invalid. (Unverified integration: protect middleware pending merge from Member 1).'
    });
  }

  return next();
}

/**
 * Setter to facilitate dependency injection of protect middleware for tests.
 * @param {Function} middleware
 */
function setProtectMiddleware(middleware) {
  protectMiddleware = middleware;
}

// ─── Route Definitions ─────────────────────────────────────────────────────────

// Standard mounting at /api/anomalies
router.get('/', protect, anomalyController.getAnomalies);
router.get('/summary', protect, anomalyController.getAnomalySummary);

// Flexible aliases if mounted at /api root
router.get('/anomalies', protect, anomalyController.getAnomalies);
router.get('/anomalies/summary', protect, anomalyController.getAnomalySummary);

// Expose helper on router for testing injection
router.setProtectMiddleware = setProtectMiddleware;
router.protect = protect;

module.exports = router;
