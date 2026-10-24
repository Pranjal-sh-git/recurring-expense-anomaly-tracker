/**
 * Analytics Service for KharchaSense Backend API
 * Handles financial analytics calculations, metric aggregations, and data retrieval.
 * Preserves Phase 1 frontend calculation semantics while supporting backend MVC architecture.
 */

let Transaction;
try {
  Transaction = require('../models/Transaction');
} catch (err) {
  // Model is supplied by Maneshwar at backend/models/Transaction.js
  // Will be resolved once branch is merged
}

/**
 * Safely parse and validate a numeric amount from a transaction object or raw value.
 * Matches Phase 1 frontend extractValidAmount semantics.
 *
 * @param {Object} transaction - Transaction object or numeric amount.
 * @returns {number} Valid numeric amount (>= 0), or 0 if invalid.
 */
function extractValidAmount(transaction) {
  if (!transaction) {
    return 0;
  }

  const rawAmount = typeof transaction === 'object' ? transaction.amount : transaction;
  if (rawAmount === null || rawAmount === undefined || typeof rawAmount === 'symbol') {
    return 0;
  }

  let numericAmount;
  if (typeof rawAmount === 'string') {
    const cleaned = rawAmount.replace(/[^0-9.-]+/g, '');
    numericAmount = Number(cleaned);
  } else {
    numericAmount = Number(rawAmount);
  }

  return (!isNaN(numericAmount) && isFinite(numericAmount) && numericAmount >= 0)
    ? numericAmount
    : 0;
}

/**
 * Safely extract a formatted YYYY-MM-DD date key from a transaction in UTC.
 * Matches Phase 1 frontend extractDateKey semantics with UTC date normalization.
 *
 * @param {Object} transaction - Transaction object.
 * @returns {string} Date string in YYYY-MM-DD format or 'Unknown'.
 */
function extractDateKey(transaction) {
  if (!transaction || typeof transaction !== 'object' || !transaction.date) {
    return 'Unknown';
  }

  const rawDate = transaction.date;

  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (!trimmed) {
      return 'Unknown';
    }
    // If it's already an ISO or date-only string like YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const parsedTimestamp = Date.parse(trimmed);
    if (!isNaN(parsedTimestamp)) {
      const d = new Date(parsedTimestamp);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return trimmed;
  }

  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    const year = rawDate.getUTCFullYear();
    const month = String(rawDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(rawDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof rawDate === 'number' && !isNaN(rawDate)) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return 'Unknown';
}

/**
 * Safely extract a trimmed category name from a transaction object.
 * Defaults to 'Uncategorized'.
 *
 * @param {Object} transaction - Transaction object.
 * @returns {string} Category name.
 */
function extractCategory(transaction) {
  if (!transaction || typeof transaction !== 'object') {
    return 'Uncategorized';
  }
  const category = transaction.category;
  if (typeof category === 'string' && category.trim() !== '') {
    return category.trim();
  }
  return 'Uncategorized';
}

/**
 * Filter an array of transactions in-memory by UTC date bounds (from and to inclusive).
 *
 * @param {Array<Object>} transactions - Array of transaction objects.
 * @param {string} [from] - Start date in YYYY-MM-DD (UTC).
 * @param {string} [to] - End date in YYYY-MM-DD (UTC).
 * @returns {Array<Object>} Filtered transactions.
 */
function filterTransactionsByDate(transactions, from, to) {
  if (!Array.isArray(transactions)) {
    return [];
  }
  if (!from && !to) {
    return transactions;
  }

  const fromTime = from ? new Date(`${from}T00:00:00.000Z`).getTime() : -Infinity;
  const toTime = to ? new Date(`${to}T23:59:59.999Z`).getTime() : Infinity;

  return transactions.filter(t => {
    if (!t) return false;
    const dateKey = extractDateKey(t);
    if (dateKey !== 'Unknown') {
      const txTime = new Date(`${dateKey}T00:00:00.000Z`).getTime();
      return txTime >= fromTime && txTime <= toTime;
    }
    const rawTime = new Date(t.date).getTime();
    if (!isNaN(rawTime)) {
      return rawTime >= fromTime && rawTime <= toTime;
    }
    return false;
  });
}

/**
 * Calculate total spending sum across transactions.
 * Preserves Phase 1 calculateTotalExpenses semantics.
 *
 * @param {Array<Object>} transactions - List of transactions.
 * @returns {number} Total expenses (rounded to 2 decimal places).
 */
function calculateTotalExpenses(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return 0;
  }
  const total = transactions.reduce((sum, t) => sum + extractValidAmount(t), 0);
  return Number(total.toFixed(2));
}

/**
 * Calculate count of valid transaction objects.
 * Preserves Phase 1 calculateTotalTransactions semantics.
 *
 * @param {Array<Object>} transactions - List of transactions.
 * @returns {number} Total count.
 */
function calculateTotalTransactions(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return 0;
  }
  return transactions.filter(t => t !== null && typeof t === 'object' && !Array.isArray(t)).length;
}

/**
 * Calculate spending totals grouped by category.
 * Preserves Phase 1 calculateCategoryTotals semantics.
 *
 * @param {Array<Object>} transactions - List of transactions.
 * @returns {Object.<string, number>} Map of category names to totals.
 */
function calculateCategoryTotals(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {};
  }
  const totals = {};
  for (const t of transactions) {
    if (!t || typeof t !== 'object' || Array.isArray(t)) {
      continue;
    }
    const category = extractCategory(t);
    const amount = extractValidAmount(t);
    const current = totals[category] || 0;
    totals[category] = Number((current + amount).toFixed(2));
  }
  return totals;
}

/**
 * Find highest-spending category.
 * Preserves Phase 1 getHighestSpendingCategory semantics.
 *
 * @param {Array<Object>} transactions - List of transactions.
 * @returns {{ category: string, amount: number, total: number } | null}
 */
function getHighestSpendingCategory(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return null;
  }
  const categoryTotals = calculateCategoryTotals(transactions);
  const categories = Object.keys(categoryTotals);
  if (categories.length === 0) {
    return null;
  }

  let highestCategory = categories[0];
  let maxAmount = categoryTotals[highestCategory];

  for (const category of categories) {
    if (categoryTotals[category] > maxAmount) {
      maxAmount = categoryTotals[category];
      highestCategory = category;
    }
  }

  return {
    category: highestCategory,
    amount: maxAmount,
    total: maxAmount
  };
}

/**
 * Calculate daily spending totals grouped chronologically.
 * Preserves Phase 1 calculateDailyTotals semantics.
 *
 * @param {Array<Object>} transactions - List of transactions.
 * @returns {Object.<string, number>} Map of date strings to totals.
 */
function calculateDailyTotals(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {};
  }
  const dailyTotals = {};
  for (const t of transactions) {
    if (!t || typeof t !== 'object' || Array.isArray(t)) {
      continue;
    }
    const dateKey = extractDateKey(t);
    const amount = extractValidAmount(t);
    const current = dailyTotals[dateKey] || 0;
    dailyTotals[dateKey] = Number((current + amount).toFixed(2));
  }

  const sortedKeys = Object.keys(dailyTotals).sort((a, b) => {
    if (a === 'Unknown') return 1;
    if (b === 'Unknown') return -1;
    return a.localeCompare(b);
  });

  const sortedTotals = {};
  for (const key of sortedKeys) {
    sortedTotals[key] = dailyTotals[key];
  }
  return sortedTotals;
}

/**
 * Calculate full summary metrics for GET /api/analytics/summary.
 * Computes:
 * - total spending
 * - transaction count
 * - highest-spending category
 * - recurring count
 * - average transaction size
 *
 * @param {Array<Object>} transactions - List of transactions.
 * @returns {Object} Summary metrics object. Never NaN.
 */
function generateSummaryMetrics(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      totalSpending: 0,
      totalExpenses: 0,
      transactionCount: 0,
      totalTransactions: 0,
      highestSpendingCategory: null,
      topCategory: null,
      recurringCount: 0,
      recurringSpend: 0,
      averageTransactionSize: 0,
      averageAmount: 0
    };
  }

  const total = calculateTotalExpenses(transactions);
  const count = calculateTotalTransactions(transactions);
  const topCat = getHighestSpendingCategory(transactions);

  const recurringTxs = transactions.filter(t => t && Boolean(t.recurring));
  const recurringSpend = Number(recurringTxs.reduce((sum, t) => sum + extractValidAmount(t), 0).toFixed(2));
  const recurringCount = recurringTxs.length;

  const averageTransactionSize = count > 0 ? Number((total / count).toFixed(2)) : 0;

  return {
    totalSpending: total,
    totalExpenses: total,
    transactionCount: count,
    totalTransactions: count,
    highestSpendingCategory: topCat ? topCat.category : null,
    topCategory: topCat ? { category: topCat.category, amount: topCat.amount, total: topCat.total } : null,
    recurringCount,
    recurringSpend,
    averageTransactionSize,
    averageAmount: averageTransactionSize
  };
}

/**
 * Calculate category breakdown and percentage distribution for GET /api/analytics/categories.
 * Computes:
 * - category-wise amount totals
 * - transaction counts
 * - percentage distribution
 *
 * @param {Array<Object>} transactions - List of transactions.
 * @returns {Object} Category analytics object.
 */
function calculateCategoryMetrics(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      categories: [],
      totals: {},
      counts: {},
      percentages: {},
      totalSpending: 0,
      totalExpenses: 0,
      totalCount: 0,
      totalTransactions: 0,
      breakdown: [],
      labels: [],
      data: []
    };
  }

  const totalSpending = calculateTotalExpenses(transactions);
  const totalCount = calculateTotalTransactions(transactions);

  const catMap = {};

  for (const t of transactions) {
    if (!t || typeof t !== 'object' || Array.isArray(t)) {
      continue;
    }
    const cat = extractCategory(t);
    const amt = extractValidAmount(t);
    if (!catMap[cat]) {
      catMap[cat] = { total: 0, count: 0 };
    }
    catMap[cat].total += amt;
    catMap[cat].count += 1;
  }

  const categoryNames = Object.keys(catMap);
  // Sort categories by total spending descending
  categoryNames.sort((a, b) => catMap[b].total - catMap[a].total);

  const totals = {};
  const counts = {};
  const percentages = {};
  const categories = [];

  for (const cat of categoryNames) {
    const rawTotal = catMap[cat].total;
    const roundedTotal = Number(rawTotal.toFixed(2));
    const count = catMap[cat].count;
    const pct = totalSpending > 0 ? Number(((rawTotal / totalSpending) * 100).toFixed(2)) : 0;

    totals[cat] = roundedTotal;
    counts[cat] = count;
    percentages[cat] = pct;

    categories.push({
      category: cat,
      total: roundedTotal,
      amount: roundedTotal,
      count,
      percentage: pct
    });
  }

  return {
    categories,
    totals,
    counts,
    percentages,
    totalSpending,
    totalExpenses: totalSpending,
    totalCount,
    totalTransactions: totalCount,
    breakdown: categories,
    labels: categories.map(c => c.category),
    data: categories.map(c => c.total)
  };
}

/**
 * Calculate chronological date-wise spending aggregation for GET /api/analytics/trends.
 * Computes:
 * - date-wise chronological spending totals and counts
 *
 * @param {Array<Object>} transactions - List of transactions.
 * @returns {Object} Trends analytics object.
 */
function calculateTrends(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      trends: [],
      dailyTotals: {},
      timeline: [],
      labels: [],
      data: [],
      totalSpending: 0,
      totalExpenses: 0,
      totalCount: 0,
      totalTransactions: 0
    };
  }

  const totalSpending = calculateTotalExpenses(transactions);
  const totalCount = calculateTotalTransactions(transactions);

  const dateMap = {};

  for (const t of transactions) {
    if (!t || typeof t !== 'object' || Array.isArray(t)) {
      continue;
    }
    const dateKey = extractDateKey(t);
    const amt = extractValidAmount(t);
    if (!dateMap[dateKey]) {
      dateMap[dateKey] = { total: 0, count: 0 };
    }
    dateMap[dateKey].total += amt;
    dateMap[dateKey].count += 1;
  }

  // Sort dates strictly chronologically in ascending order
  const sortedDates = Object.keys(dateMap).sort((a, b) => {
    if (a === 'Unknown') return 1;
    if (b === 'Unknown') return -1;
    return a.localeCompare(b);
  });

  const dailyTotals = {};
  const trends = [];

  for (const date of sortedDates) {
    const rawTotal = dateMap[date].total;
    const roundedTotal = Number(rawTotal.toFixed(2));
    const count = dateMap[date].count;

    dailyTotals[date] = roundedTotal;
    trends.push({
      date,
      total: roundedTotal,
      amount: roundedTotal,
      count
    });
  }

  return {
    trends,
    dailyTotals,
    timeline: trends,
    labels: trends.map(t => t.date),
    data: trends.map(t => t.total),
    totalSpending,
    totalExpenses: totalSpending,
    totalCount,
    totalTransactions: totalCount
  };
}

/**
 * Calculate recurring vs nonrecurring summaries for GET /api/analytics/recurring.
 * Computes:
 * - recurring amount and count
 * - nonrecurring amount and count
 * - percentage distribution
 *
 * @param {Array<Object>} transactions - List of transactions.
 * @returns {Object} Recurring analytics object.
 */
function calculateRecurringTotals(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      recurring: {
        amount: 0,
        total: 0,
        count: 0,
        percentage: 0
      },
      nonRecurring: {
        amount: 0,
        total: 0,
        count: 0,
        percentage: 0
      },
      nonrecurring: {
        amount: 0,
        total: 0,
        count: 0,
        percentage: 0
      },
      totalSpending: 0,
      totalExpenses: 0,
      totalCount: 0,
      totalTransactions: 0
    };
  }

  const totalSpending = calculateTotalExpenses(transactions);
  const totalCount = calculateTotalTransactions(transactions);

  let recurringAmount = 0;
  let recurringCount = 0;
  let nonRecurringAmount = 0;
  let nonRecurringCount = 0;

  for (const t of transactions) {
    if (!t || typeof t !== 'object' || Array.isArray(t)) {
      continue;
    }
    const amt = extractValidAmount(t);
    if (Boolean(t.recurring)) {
      recurringAmount += amt;
      recurringCount += 1;
    } else {
      nonRecurringAmount += amt;
      nonRecurringCount += 1;
    }
  }

  const roundedRecAmt = Number(recurringAmount.toFixed(2));
  const roundedNonRecAmt = Number(nonRecurringAmount.toFixed(2));

  const recPct = totalSpending > 0 ? Number(((recurringAmount / totalSpending) * 100).toFixed(2)) : 0;
  const nonRecPct = totalSpending > 0 ? Number(((nonRecurringAmount / totalSpending) * 100).toFixed(2)) : 0;

  const recObj = {
    amount: roundedRecAmt,
    total: roundedRecAmt,
    count: recurringCount,
    percentage: recPct
  };

  const nonRecObj = {
    amount: roundedNonRecAmt,
    total: roundedNonRecAmt,
    count: nonRecurringCount,
    percentage: nonRecPct
  };

  return {
    recurring: recObj,
    nonRecurring: nonRecObj,
    nonrecurring: nonRecObj,
    totalSpending,
    totalExpenses: totalSpending,
    totalCount,
    totalTransactions: totalCount
  };
}

/**
 * Fetch transactions scoped to a user and optional date range from MongoDB.
 * Adheres to the shared data isolation and date filter contract.
 *
 * @param {Object} options
 * @param {string} options.userId - Authenticated user identifier.
 * @param {string} [options.from] - Start date YYYY-MM-DD (UTC).
 * @param {string} [options.to] - End date YYYY-MM-DD (UTC).
 * @param {Object} [options.Model] - Optional Mongoose Model override for testing or injection.
 * @returns {Promise<Array<Object>>}
 */
async function fetchTransactions({ userId, from, to, Model = Transaction }) {
  if (!Model) {
    const error = new Error('Transaction model is not available. Integration with backend/models/Transaction.js is required.');
    error.statusCode = 503;
    throw error;
  }

  const query = {};

  // Support both 'user' and 'userId' field naming conventions in schema
  if (Model.schema && Model.schema.paths) {
    if (Model.schema.paths.userId) {
      query.userId = userId;
    } else if (Model.schema.paths.user) {
      query.user = userId;
    } else {
      query.$or = [{ user: userId }, { userId: userId }];
    }
  } else {
    query.$or = [{ user: userId }, { userId: userId }];
  }

  if (from || to) {
    query.date = {};
    if (from) {
      query.date.$gte = new Date(`${from}T00:00:00.000Z`);
    }
    if (to) {
      query.date.$lte = new Date(`${to}T23:59:59.999Z`);
    }
  }

  return await Model.find(query).lean().exec();
}

/**
 * Resolves transactions either from database or from provided transaction fixtures.
 *
 * @param {Object} options
 * @returns {Promise<Array<Object>>}
 */
async function resolveTransactions({ userId, from, to, transactions, Model = Transaction } = {}) {
  if (Array.isArray(transactions)) {
    return filterTransactionsByDate(transactions, from, to);
  }
  return await fetchTransactions({ userId, from, to, Model });
}

/**
 * Service: Retrieve summary metrics.
 */
async function getSummary(options = {}) {
  const txs = await resolveTransactions(options);
  return generateSummaryMetrics(txs);
}

/**
 * Service: Retrieve category metrics.
 */
async function getCategories(options = {}) {
  const txs = await resolveTransactions(options);
  return calculateCategoryMetrics(txs);
}

/**
 * Service: Retrieve trend metrics.
 */
async function getTrends(options = {}) {
  const txs = await resolveTransactions(options);
  return calculateTrends(txs);
}

/**
 * Service: Retrieve recurring metrics.
 */
async function getRecurring(options = {}) {
  const txs = await resolveTransactions(options);
  return calculateRecurringTotals(txs);
}

module.exports = {
  // Pure calculation functions (Phase 1 semantics)
  extractValidAmount,
  extractDateKey,
  extractCategory,
  filterTransactionsByDate,
  calculateTotalExpenses,
  calculateTotalTransactions,
  calculateCategoryTotals,
  getHighestSpendingCategory,
  calculateDailyTotals,
  generateSummaryMetrics,
  calculateCategoryMetrics,
  calculateTrends,
  calculateRecurringTotals,
  // Database / Model integration
  fetchTransactions,
  resolveTransactions,
  // Service endpoints
  getSummary,
  getCategories,
  getTrends,
  getRecurring
};
