/**
 * Analytics Service for calculating expense metrics and aggregations.
 * Phase 1 - Day 1 Foundation
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
    return sum + (isNaN(amount) ? 0 : amount);
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
    const validAmount = isNaN(amount) ? 0 : amount;

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
 * Get a complete summary of all Day 1 analytics metrics.
 * @param {Array<Object>} transactions - List of transaction objects.
 * @returns {Object} Comprehensive analytics metrics summary.
 */
export function getAnalyticsSummary(transactions) {
  return {
    totalExpenses: calculateTotalExpenses(transactions),
    totalCount: calculateTotalTransactions(transactions),
    categoryTotals: calculateCategoryTotals(transactions),
    highestSpendingCategory: getHighestSpendingCategory(transactions)
  };
}

// Aliases for convenience and flexible naming conventions
export const getTotalExpenses = calculateTotalExpenses;
export const getTotalTransactionCount = calculateTotalTransactions;
export const getTransactionCount = calculateTotalTransactions;
export const getCategoryTotals = calculateCategoryTotals;
export const getSpendingByCategory = calculateCategoryTotals;
export const calculateHighestSpendingCategory = getHighestSpendingCategory;

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
  getAnalyticsSummary
};
