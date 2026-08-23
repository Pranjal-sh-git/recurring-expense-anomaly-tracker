/**
 * Analytics Service for calculating expense metrics, aggregations, and chart data.
 * Member 4 - Analytics and Formatters Sprint
 */

/**
 * Safely parse and validate a numeric amount from a transaction object.
 *
 * @param {Object} transaction - Transaction object.
 * @returns {number} Valid numeric amount (>= 0), or 0 if invalid.
 */
function extractValidAmount(transaction) {
  if (!transaction || typeof transaction !== 'object') {
    return 0;
  }

  let rawAmount = transaction.amount;
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
 * Safely extract a formatted YYYY-MM-DD date key from a transaction object.
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
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.substring(0, 10);
    }
    const parsedTimestamp = Date.parse(trimmed);
    if (!isNaN(parsedTimestamp)) {
      const d = new Date(parsedTimestamp);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return trimmed;
  }

  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    const year = rawDate.getFullYear();
    const month = String(rawDate.getMonth() + 1).padStart(2, '0');
    const day = String(rawDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof rawDate === 'number' && !isNaN(rawDate)) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return 'Unknown';
}

/**
 * Calculate the total of all valid transaction amounts.
 *
 * @param {Array<Object>} transactions - List of transaction objects.
 * @returns {number} Total expenses sum (rounded to 2 decimal places).
 */
export function calculateTotalExpenses(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return 0;
  }

  const total = transactions.reduce((sum, transaction) => {
    return sum + extractValidAmount(transaction);
  }, 0);

  return Number(total.toFixed(2));
}

/**
 * Calculate the total count of valid transactions.
 *
 * @param {Array<Object>} transactions - List of transaction objects.
 * @returns {number} Count of valid transactions.
 */
export function calculateTotalTransactions(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return 0;
  }

  return transactions.filter(t => t !== null && typeof t === 'object' && !Array.isArray(t)).length;
}

/**
 * Calculate spending totals grouped by category.
 *
 * @param {Array<Object>} transactions - List of transaction objects.
 * @returns {Object.<string, number>} Object mapping category names to total spending.
 */
export function calculateCategoryTotals(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {};
  }

  const totals = {};

  for (const transaction of transactions) {
    if (!transaction || typeof transaction !== 'object' || Array.isArray(transaction)) {
      continue;
    }

    const category =
      transaction.category && typeof transaction.category === 'string' && transaction.category.trim() !== ''
        ? transaction.category.trim()
        : 'Uncategorized';

    const amount = extractValidAmount(transaction);
    const current = totals[category] || 0;
    totals[category] = Number((current + amount).toFixed(2));
  }

  return totals;
}

/**
 * Find the category with the highest total spending.
 *
 * @param {Array<Object>} transactions - List of transaction objects.
 * @returns {{ category: string, amount: number, total: number } | null} The highest spending category info or null if empty.
 */
export function getHighestSpendingCategory(transactions) {
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
 * Calculate daily spending totals grouped chronologically by date.
 *
 * @param {Array<Object>} transactions - List of transaction objects.
 * @returns {Object.<string, number>} Object mapping date strings to total spending.
 */
export function calculateDailyTotals(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {};
  }

  const dailyTotals = {};

  for (const transaction of transactions) {
    if (!transaction || typeof transaction !== 'object' || Array.isArray(transaction)) {
      continue;
    }

    const dateKey = extractDateKey(transaction);
    const amount = extractValidAmount(transaction);
    const current = dailyTotals[dateKey] || 0;
    dailyTotals[dateKey] = Number((current + amount).toFixed(2));
  }

  // Sort daily totals chronologically (Unknown placed at the end)
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
 * Generate a clean dashboard summary of key transaction metrics.
 * Note: Anomaly counts are excluded as anomaly detection belongs to the anomaly engine.
 *
 * @param {Array<Object>} transactions - List of transaction objects.
 * @returns {{ totalExpenses: number, totalTransactions: number, highestSpendingCategory: string | null }}
 */
export function generateDashboardSummary(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      totalExpenses: 0,
      totalTransactions: 0,
      highestSpendingCategory: null
    };
  }

  const highest = getHighestSpendingCategory(transactions);

  return {
    totalExpenses: calculateTotalExpenses(transactions),
    totalTransactions: calculateTotalTransactions(transactions),
    highestSpendingCategory: highest ? highest.category : null
  };
}

/**
 * Return category spending in a structured format suitable for chart rendering.
 *
 * @param {Array<Object>} transactions - List of transaction objects.
 * @returns {{ labels: string[], data: number[], datasets: Array<{ label: string, data: number[] }>, breakdown: Array<{ category: string, amount: number, total: number }> }}
 */
export function getCategorySpendingData(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      labels: [],
      data: [],
      datasets: [
        {
          label: 'Spending by Category',
          data: []
        }
      ],
      breakdown: []
    };
  }

  const categoryTotals = calculateCategoryTotals(transactions);
  const labels = Object.keys(categoryTotals);
  const data = labels.map(category => categoryTotals[category]);
  const breakdown = labels.map(category => ({
    category,
    amount: categoryTotals[category],
    total: categoryTotals[category]
  }));

  return {
    labels,
    data,
    datasets: [
      {
        label: 'Spending by Category',
        data
      }
    ],
    breakdown
  };
}

/**
 * Return daily spending in a structured format suitable for time-series chart rendering.
 *
 * @param {Array<Object>} transactions - List of transaction objects.
 * @returns {{ labels: string[], data: number[], datasets: Array<{ label: string, data: number[] }> }}
 */
export function getDailySpendingData(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      labels: [],
      data: [],
      datasets: [
        {
          label: 'Daily Spending',
          data: []
        }
      ]
    };
  }

  const dailyTotals = calculateDailyTotals(transactions);
  const labels = Object.keys(dailyTotals);
  const data = labels.map(date => dailyTotals[date]);

  return {
    labels,
    data,
    datasets: [
      {
        label: 'Daily Spending',
        data
      }
    ]
  };
}

/**
 * Get a complete summary of all analytics metrics.
 *
 * @param {Array<Object>} transactions - List of transaction objects.
 * @returns {Object} Comprehensive analytics metrics summary.
 */
export function getAnalyticsSummary(transactions) {
  return {
    totalExpenses: calculateTotalExpenses(transactions),
    totalCount: calculateTotalTransactions(transactions),
    categoryTotals: calculateCategoryTotals(transactions),
    highestSpendingCategory: getHighestSpendingCategory(transactions),
    dashboardSummary: generateDashboardSummary(transactions),
    categorySpendingData: getCategorySpendingData(transactions),
    dailyTotals: calculateDailyTotals(transactions),
    dailySpendingData: getDailySpendingData(transactions)
  };
}

// Aliases for convenience and backward compatibility
export const getTotalExpenses = calculateTotalExpenses;
export const getTotalTransactionCount = calculateTotalTransactions;
export const getTransactionCount = calculateTotalTransactions;
export const getCategoryTotals = calculateCategoryTotals;
export const getSpendingByCategory = calculateCategoryTotals;
export const calculateHighestSpendingCategory = getHighestSpendingCategory;
export const getDashboardSummary = generateDashboardSummary;
export const calculateCategorySpendingData = getCategorySpendingData;
export const getCategoryChartData = getCategorySpendingData;
export const getDailySpendingTotals = calculateDailyTotals;
export const getDailyTotals = calculateDailyTotals;
export const getDailySpending = calculateDailyTotals;
export const calculateDailySpending = calculateDailyTotals;
export const getDailySpendingDataAlias = getDailySpendingData;
export const calculateDailySpendingData = getDailySpendingData;
export const getDailyChartData = getDailySpendingData;

export default {
  calculateTotalExpenses,
  getTotalExpenses,
  calculateTotalTransactions,
  getTotalTransactionCount,
  getTransactionCount,
  calculateCategoryTotals,
  getCategoryTotals,
  getSpendingByCategory,
  getHighestSpendingCategory,
  calculateHighestSpendingCategory,
  generateDashboardSummary,
  getDashboardSummary,
  getCategorySpendingData,
  calculateCategorySpendingData,
  getCategoryChartData,
  calculateDailyTotals,
  getDailySpendingTotals,
  getDailyTotals,
  getDailySpending,
  calculateDailySpending,
  getDailySpendingData,
  calculateDailySpendingData,
  getDailyChartData,
  getAnalyticsSummary
};
