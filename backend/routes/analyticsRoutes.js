/**
 * Analytics Routes for KharchaSense Backend API
 * Mounts protected endpoints for expense summaries, category breakdowns, trends, and recurring analytics.
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

const { protect } = require('../middleware/authMiddleware');

// All analytics endpoints are protected by canonical auth middleware
router.use(protect);

// ─── Analytics Endpoint Bindings ───────────────────────────────────────────────
router.get('/summary', analyticsController.getSummary);
router.get('/categories', analyticsController.getCategories);
router.get('/trends', analyticsController.getTrends);
router.get('/recurring', analyticsController.getRecurring);

module.exports = router;
