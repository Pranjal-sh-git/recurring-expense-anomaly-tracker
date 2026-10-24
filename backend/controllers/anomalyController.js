/**
 * KharchaSense Backend Anomaly Controller
 * 
 * Express MVC Controller handling anomaly detection requests.
 * Connects HTTP endpoints to the pure numerical anomalyService.
 * 
 * Endpoints:
 * - GET /api/anomalies: Returns user-specific anomalies (flagged-only by default).
 * - GET /api/anomalies/summary: Returns statistical summary (examined count, anomaly count, category/severity breakdowns).
 * 
 * Shared Contracts & Architecture:
 * - Authentication: Relies on `protect` middleware supplying `req.user.id`.
 * - Persistence Model: Scoped against `backend/models/Transaction.js` (canonical model by Maneshwar).
 * - User Isolation: All queries are strictly scoped to the authenticated user (`req.user.id`).
 * - Read-Time Calculation: Derived `isAnomaly` and `zScore` are computed dynamically at request time
 *   and NEVER persisted into MongoDB to eliminate stale results across updates/deletes.
 */

'use strict';

const mongoose = require('mongoose');
const anomalyService = require('../services/anomalyService');

// Attempt to resolve canonical Transaction model.
// If not yet present (in-flight dependency from Member 2 / Maneshwar),
// controller allows runtime injection or falls back gracefully with explicit status.
let TransactionModel = null;
try {
  TransactionModel = require('../models/Transaction');
  if (TransactionModel && TransactionModel.default) {
    TransactionModel = TransactionModel.default;
  }
} catch (err) {
  // Dependency note: backend/models/Transaction.js not yet integrated on this branch.
  // Controller will check mongoose.models.Transaction or injected model at runtime.
}

/**
 * Setter to facilitate dependency injection for tests or integration harnesses.
 * @param {Object} model - Mongoose model or mock model
 */
function setTransactionModel(model) {
  TransactionModel = model;
}

/**
 * Resolves the active Transaction model instance.
 * @returns {Object|null}
 */
function getActiveTransactionModel() {
  if (TransactionModel) {
    return TransactionModel;
  }
  if (mongoose.models && mongoose.models.Transaction) {
    return mongoose.models.Transaction;
  }
  return null;
}

/**
 * Parses and validates date parameters from query string.
 * Supports both `from`/`to` and `startDate`/`endDate`.
 *
 * @param {Object} query - Express req.query
 * @returns {{ fromDate: Date|null, toDate: Date|null }}
 * @throws {Error} If date format is invalid or fromDate > toDate
 */
function parseDateFilter(query) {
  const fromRaw = query.from || query.startDate;
  const toRaw = query.to || query.endDate;

  let fromDate = null;
  let toDate = null;

  if (fromRaw) {
    fromDate = new Date(fromRaw);
    if (isNaN(fromDate.getTime())) {
      const err = new Error('Invalid date format for "from" or "startDate". Expected valid ISO date string.');
      err.statusCode = 400;
      throw err;
    }
  }

  if (toRaw) {
    toDate = new Date(toRaw);
    if (isNaN(toDate.getTime())) {
      const err = new Error('Invalid date format for "to" or "endDate". Expected valid ISO date string.');
      err.statusCode = 400;
      throw err;
    }

    // If date-only format (YYYY-MM-DD), make it end-of-day inclusive
    if (typeof toRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(toRaw.trim())) {
      toDate.setUTCHours(23, 59, 59, 999);
    }
  }

  if (fromDate && toDate && fromDate > toDate) {
    const err = new Error('"from" date cannot be after "to" date.');
    err.statusCode = 400;
    throw err;
  }

  return { fromDate, toDate };
}

/**
 * Constructs a secure MongoDB query ensuring strict user isolation and date filtering.
 * Never accesses transactions belonging to another user.
 *
 * @param {string|Object} userId - Authenticated user identifier (req.user.id)
 * @param {Object} queryParams - Express req.query
 * @param {Object} Model - Active Mongoose model
 * @returns {Object} MongoDB query filter object
 */
function buildUserScopedQuery(userId, queryParams, Model) {
  if (!userId) {
    const err = new Error('Unauthorized: Authentication required.');
    err.statusCode = 401;
    throw err;
  }

  // Handle schema field variation: 'user' (Maneshwar canonical spec) or 'userId' (API contract spec)
  const schemaPaths = Model && Model.schema && Model.schema.paths ? Model.schema.paths : null;
  let userClause;

  if (schemaPaths) {
    if (schemaPaths.user && !schemaPaths.userId) {
      userClause = { user: userId };
    } else if (schemaPaths.userId && !schemaPaths.user) {
      userClause = { userId: userId };
    } else {
      userClause = { $or: [{ user: userId }, { userId: userId }] };
    }
  } else {
    // Model schema not inspectable or mock model: match either field
    userClause = { $or: [{ user: userId }, { userId: userId }] };
  }

  const query = { ...userClause };

  // Date range filtering
  const { fromDate, toDate } = parseDateFilter(queryParams);
  if (fromDate || toDate) {
    query.date = {};
    if (fromDate) {
      query.date.$gte = fromDate;
    }
    if (toDate) {
      query.date.$lte = toDate;
    }
  }

  // Optional category filter
  if (queryParams.category && typeof queryParams.category === 'string' && queryParams.category.trim()) {
    query.category = queryParams.category.trim();
  }

  return query;
}

/**
 * Normalizes a transaction object into the standardized response contract.
 * Guarantees presence of: id, title, amount, category, date, recurring, isAnomaly, zScore, anomalyReason.
 *
 * @param {Object} tx - Enriched transaction object from anomalyService
 * @returns {Object}
 */
function formatTransactionOutput(tx) {
  const id = tx._id ? tx._id.toString() : (tx.id ? String(tx.id) : '');
  const dateIso = tx.date instanceof Date
    ? tx.date.toISOString()
    : (typeof tx.date === 'string' ? tx.date : new Date().toISOString());

  return {
    id,
    title: tx.title || '',
    amount: typeof tx.amount === 'number' ? tx.amount : (Number(tx.amount) || 0),
    category: tx.category || 'Uncategorized',
    date: dateIso,
    recurring: Boolean(tx.recurring),
    isAnomaly: Boolean(tx.isAnomaly),
    zScore: typeof tx.zScore === 'number' ? tx.zScore : (Number(tx.zScore) || 0),
    anomalyReason: tx.anomalyReason || null,
    categoryMean: tx.categoryMean !== undefined ? tx.categoryMean : null,
    categoryStandardDeviation: tx.categoryStandardDeviation !== undefined ? tx.categoryStandardDeviation : null
  };
}

/**
 * GET /api/anomalies
 * 
 * Fetches user-scoped transactions, evaluates category-wise Z-Scores on-the-fly,
 * and returns anomalous transactions.
 * 
 * Clearly defined behavior:
 * - Default: Returns FLAGGED-ONLY rows (`isAnomaly: true`), sorted by deviation severity (|Z| descending).
 * - Optional: `flaggedOnly=false` or `all=true` returns all examined transactions with computed anomaly metrics.
 * - Optional Query Parameters:
 *   - `from` or `startDate`: ISO date filter (inclusive)
 *   - `to` or `endDate`: ISO date filter (inclusive)
 *   - `threshold`: Custom Z-score threshold (default: 2)
 *   - `category`: Filter by category name
 *   - `flaggedOnly`: 'true' | 'false' (default: 'true')
 */
async function getAnomalies(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required: req.user.id not found.'
      });
    }

    const Model = getActiveTransactionModel();
    if (!Model) {
      return res.status(503).json({
        success: false,
        message: 'Transaction model dependency not yet integrated (backend/models/Transaction.js). Shared interface implementation active.'
      });
    }

    // Build user-scoped query
    const query = buildUserScopedQuery(userId, req.query, Model);

    // Fetch transactions from MongoDB
    let dbQuery = Model.find(query);
    if (typeof dbQuery.lean === 'function') {
      dbQuery = dbQuery.lean();
    }
    if (typeof dbQuery.sort === 'function') {
      dbQuery = dbQuery.sort({ date: -1 });
    }
    const transactions = await dbQuery.exec ? await dbQuery.exec() : await dbQuery;

    // Parse custom threshold if provided
    let threshold = anomalyService.ANOMALY_Z_THRESHOLD;
    if (req.query.threshold !== undefined) {
      const parsedThresh = Number(req.query.threshold);
      if (!isNaN(parsedThresh) && isFinite(parsedThresh) && parsedThresh > 0) {
        threshold = parsedThresh;
      }
    }

    // Run pure numerical anomaly detection (read-time only, never saved to MongoDB)
    const analyzed = anomalyService.detectAnomalies(transactions || [], threshold);

    // Determine flagged-only vs all rows:
    // Default is flagged-only as requested by specification.
    const isFlaggedOnly = req.query.flaggedOnly !== 'false' && req.query.all !== 'true';

    const filtered = isFlaggedOnly
      ? analyzed.filter(t => Boolean(t.isAnomaly))
      : analyzed;

    // Sort flagged anomalies by absolute Z-Score descending (highest deviation first)
    if (isFlaggedOnly) {
      filtered.sort((a, b) => Math.abs(Number(b.zScore) || 0) - Math.abs(Number(a.zScore) || 0));
    }

    const formattedAnomalies = filtered.map(formatTransactionOutput);

    return res.status(200).json({
      success: true,
      message: isFlaggedOnly
        ? `Retrieved ${formattedAnomalies.length} flagged anomalous transactions (flagged-only mode)`
        : `Retrieved ${formattedAnomalies.length} analyzed transactions`,
      data: {
        anomalies: formattedAnomalies,
        count: formattedAnomalies.length,
        examinedCount: (transactions || []).length,
        flaggedOnly: isFlaggedOnly,
        threshold
      }
    });
  } catch (err) {
    if (err.statusCode === 400 || err.statusCode === 401) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    return next(err);
  }
}

/**
 * GET /api/anomalies/summary
 * 
 * Fetches user-scoped transactions, performs category-wise Z-score analysis,
 * and generates statistical summaries including examined count, anomaly count,
 * category breakdown, and severity distributions.
 * 
 * Optional Query Parameters:
 * - `from` or `startDate`: ISO date filter
 * - `to` or `endDate`: ISO date filter
 * - `threshold`: Custom Z-score threshold (default: 2)
 */
async function getAnomalySummary(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required: req.user.id not found.'
      });
    }

    const Model = getActiveTransactionModel();
    if (!Model) {
      return res.status(503).json({
        success: false,
        message: 'Transaction model dependency not yet integrated (backend/models/Transaction.js). Shared interface implementation active.'
      });
    }

    // Build user-scoped query
    const query = buildUserScopedQuery(userId, req.query, Model);

    // Fetch transactions from MongoDB
    let dbQuery = Model.find(query);
    if (typeof dbQuery.lean === 'function') {
      dbQuery = dbQuery.lean();
    }
    const transactions = await dbQuery.exec ? await dbQuery.exec() : await dbQuery;

    // Parse custom threshold if provided
    let threshold = anomalyService.ANOMALY_Z_THRESHOLD;
    if (req.query.threshold !== undefined) {
      const parsedThresh = Number(req.query.threshold);
      if (!isNaN(parsedThresh) && isFinite(parsedThresh) && parsedThresh > 0) {
        threshold = parsedThresh;
      }
    }

    // Generate comprehensive summary via pure numerical service
    const rawSummary = anomalyService.getAnomalySummary(transactions || [], threshold);

    // Format individual anomalies in summary
    const formattedAnomalies = (rawSummary.anomalies || []).map(formatTransactionOutput);

    const summaryData = {
      examinedCount: rawSummary.examinedCount,
      totalTransactions: rawSummary.totalTransactions,
      anomalyCount: rawSummary.anomalyCount,
      anomalyRate: rawSummary.anomalyRate,
      byCategory: rawSummary.byCategory,
      anomaliesByCategory: rawSummary.anomaliesByCategory,
      bySeverity: rawSummary.bySeverity,
      severityBreakdown: rawSummary.severityBreakdown,
      categoryBreakdown: rawSummary.categoryBreakdown,
      anomalies: formattedAnomalies,
      threshold
    };

    return res.status(200).json({
      success: true,
      message: 'Anomaly summary calculated successfully',
      data: summaryData
    });
  } catch (err) {
    if (err.statusCode === 400 || err.statusCode === 401) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    return next(err);
  }
}

module.exports = {
  getAnomalies,
  getAnomalySummary,
  setTransactionModel,
  getActiveTransactionModel,
  buildUserScopedQuery,
  parseDateFilter,
  formatTransactionOutput
};
