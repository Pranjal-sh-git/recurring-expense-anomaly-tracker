/**
 * Analytics Controller for KharchaSense Backend API
 * Request/response handlers for financial analytics endpoints.
 * All endpoints are protected and scoped to req.user.id with optional UTC date filters.
 */

const analyticsService = require('../services/analyticsService');

/**
 * Validates whether a string is a valid YYYY-MM-DD calendar date in UTC.
 *
 * @param {string} dateStr
 * @returns {boolean}
 */
function isValidDateString(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Validates optional from/to query filter parameters.
 *
 * @param {string} [from] - Start date in YYYY-MM-DD.
 * @param {string} [to] - End date in YYYY-MM-DD.
 * @returns {{ isValid: boolean, message?: string }}
 */
function validateDateRange(from, to) {
  if (from !== undefined && from !== null && from !== '') {
    if (!isValidDateString(from)) {
      return { isValid: false, message: 'Invalid "from" date. Format must be YYYY-MM-DD' };
    }
  }

  if (to !== undefined && to !== null && to !== '') {
    if (!isValidDateString(to)) {
      return { isValid: false, message: 'Invalid "to" date. Format must be YYYY-MM-DD' };
    }
  }

  if (from && to && from > to) {
    return { isValid: false, message: '"from" date cannot be after "to" date' };
  }

  return { isValid: true };
}

/**
 * Extracts and verifies the authenticated user ID from req.user.
 *
 * @param {Object} req - Express request.
 * @returns {string|null} User ID string or null if unauthenticated.
 */
function getAuthenticatedUserId(req) {
  if (!req || !req.user) {
    return null;
  }
  return req.user.id || req.user._id || null;
}

/**
 * GET /api/analytics/summary
 * Total spending, transaction count, highest-spending category, recurring count, average transaction size.
 */
async function getSummary(req, res, next) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required'
      });
    }

    const { from, to } = req.query;
    const validation = validateDateRange(from, to);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    const data = await analyticsService.getSummary({
      userId,
      from: from || undefined,
      to: to || undefined
    });

    return res.status(200).json({
      success: true,
      message: 'Analytics summary retrieved successfully',
      data
    });
  } catch (err) {
    const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Internal server error while retrieving analytics summary'
    });
  }
}

/**
 * GET /api/analytics/categories
 * Category-wise amount totals, counts, and percentage distribution.
 */
async function getCategories(req, res, next) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required'
      });
    }

    const { from, to } = req.query;
    const validation = validateDateRange(from, to);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    const data = await analyticsService.getCategories({
      userId,
      from: from || undefined,
      to: to || undefined
    });

    return res.status(200).json({
      success: true,
      message: 'Category analytics retrieved successfully',
      data
    });
  } catch (err) {
    const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Internal server error while retrieving category analytics'
    });
  }
}

/**
 * GET /api/analytics/trends
 * Date-wise chronological spending aggregation.
 */
async function getTrends(req, res, next) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required'
      });
    }

    const { from, to } = req.query;
    const validation = validateDateRange(from, to);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    const data = await analyticsService.getTrends({
      userId,
      from: from || undefined,
      to: to || undefined
    });

    return res.status(200).json({
      success: true,
      message: 'Spending trends retrieved successfully',
      data
    });
  } catch (err) {
    const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Internal server error while retrieving spending trends'
    });
  }
}

/**
 * GET /api/analytics/recurring
 * Recurring vs nonrecurring amount/count summaries.
 */
async function getRecurring(req, res, next) {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required'
      });
    }

    const { from, to } = req.query;
    const validation = validateDateRange(from, to);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    const data = await analyticsService.getRecurring({
      userId,
      from: from || undefined,
      to: to || undefined
    });

    return res.status(200).json({
      success: true,
      message: 'Recurring expense analytics retrieved successfully',
      data
    });
  } catch (err) {
    const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Internal server error while retrieving recurring analytics'
    });
  }
}

module.exports = {
  validateDateRange,
  isValidDateString,
  getAuthenticatedUserId,
  getSummary,
  getCategories,
  getTrends,
  getRecurring
};
