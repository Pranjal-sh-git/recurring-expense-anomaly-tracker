/**
 * Analytics Routes for KharchaSense Backend API
 * Mounts protected endpoints for expense summaries, category breakdowns, trends, and recurring analytics.
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Auth middleware protect is supplied by Pranjal at backend/middleware/authMiddleware.js
let authModule;
try {
  authModule = require('../middleware/authMiddleware');
} catch (err1) {
  try {
    authModule = require('../middlewares/authMiddleware');
  } catch (err2) {
    // Auth middleware protect will be supplied by Pranjal at backend/middleware/authMiddleware.js
  }
}

const protect = authModule && (authModule.protect || (typeof authModule === 'function' ? authModule : null));

/**
 * Route protection wrapper:
 * If Pranjal's protect middleware is loaded, it executes it.
 * If running prior to branch merge or in isolated testing, ensures request has authenticated user context.
 */
const requireAuth = (req, res, next) => {
  if (typeof protect === 'function') {
    return protect(req, res, next);
  }

  // Fallback for tests/pre-merge: ensures endpoint remains strictly protected
  if (req.user && (req.user.id || req.user._id)) {
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Unauthorized: Authentication token is missing or invalid'
  });
};

// All analytics endpoints are protected
router.use(requireAuth);

// ─── Analytics Endpoint Bindings ───────────────────────────────────────────────
router.get('/summary', analyticsController.getSummary);
router.get('/categories', analyticsController.getCategories);
router.get('/trends', analyticsController.getTrends);
router.get('/recurring', analyticsController.getRecurring);

module.exports = router;
