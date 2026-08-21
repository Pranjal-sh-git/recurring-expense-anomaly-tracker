/**
 * Analytics Service for calculating expense metrics and aggregations.
 * Phase 1 - Day 2 Foundation
 */

/**
 * Calculate the total sum of all transaction amounts.
 * @param {Array<Object>} transactions - List of transaction objects.
 * @returns {number} Total expenses sum (rounded to 2 decimal places).
 */
export function calculateTotalExpenses(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return 0;
  }

  const total = transactions.reduce((sum, transaction) => {
    if (!transaction || typeof transaction !== 'object') {
      return sum;
    }
    const amount = Number(transaction.amount);
    return sum + (isNaN(amount) || !isFinite(amount) ? 0 : amount);
  }, 0);

  return Number(total.toFixed(2));
}

/**
 * Calculate the total number of transactions.
 * @param {Array<Object>} transactions - List of transaction objects.
 * @returns {number} Count of transactions.
 */
export function calculateTotalTransactions(transactions) {
  if (!Array.isArray(transactions)) {
    return 0;
  }
  return transactions.length;
}

/**
 * Calculate spending totals grouped by category.
 * @param {Array<Object>} transactions - List of transaction objects.
 * @returns {Object.<string, number>} Object mapping category names to total spending.
 */
export function calculateCategoryTotals(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {};
  }

  return transactions.reduce((totals, transaction) => {
    if (!transaction || typeof transaction !== 'object') {
      return totals;
    }

    const category =
      transaction.category && typeof transaction.category === 'string' && transaction.category.trim() !== ''
        ? transaction.category.trim()
        : 'Uncategorized';

    const amount = Number(transaction.amount);
    const validAmount = isNaN(amount) || !isFinite(amount) ? 0 : amount;

    const currentTotal = totals[category] || 0;
    totals[category] = Number((currentTotal + validAmount).toFixed(2));

    return totals;
  }, {});
}

/**
 * Find the category with the highest total spending.
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
 * Generate a clean dashboard summary of key transaction metrics.
 * Note: Anomaly counts are excluded as they belong to the anomaly engine.
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
 * Return category spending in a structured format suitable for future chart rendering.
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
 * Calculate daily spending totals grouped chronologically by date.
 * @param {Array<Object>} transactions - List of transaction objects.
 * @returns {Object.<string, number>} Object mapping date strings to total spending.
 */
export function calculateDailyTotals(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {};
  }

  const dailyTotals = transactions.reduce((totals, transaction) => {
    if (!transaction || typeof transaction !== 'object') {
      return totals;
    }

    let dateKey = 'Unknown';
    if (transaction.date && typeof transaction.date === 'string' && transaction.date.trim() !== '') {
      dateKey = transaction.date.trim();
    } else if (transaction.date instanceof Date && !isNaN(transaction.date.getTime())) {
      const year = transaction.date.getFullYear();
      const month = String(transaction.date.getMonth() + 1).padStart(2, '0');
      const day = String(transaction.date.getDate()).padStart(2, '0');
      dateKey = `${year}-${month}-${day}`;
    }

    const amount = Number(transaction.amount);
    const validAmount = isNaN(amount) || !isFinite(amount) ? 0 : amount;

    const currentTotal = totals[dateKey] || 0;
    totals[dateKey] = Number((currentTotal + validAmount).toFixed(2));

    return totals;
  }, {});

  // Sort daily totals chronologically by date keys
  const sortedKeys = Object.keys(dailyTotals).sort();
  const sortedTotals = {};
  for (const key of sortedKeys) {
    sortedTotals[key] = dailyTotals[key];
  }

  return sortedTotals;
}

/**
 * Return daily spending in a structured format suitable for future time-series chart rendering.
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

// Aliases for convenience and flexible naming conventions
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
  getDailyChartData,
  getAnalyticsSummary
};
