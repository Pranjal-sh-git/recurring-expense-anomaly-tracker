/**
 * KharchaSense Backend Anomaly Detection Service
 * 
 * Ported from frontend/js/services/anomalyService.js for backend Express MVC architecture.
 * Provides pure numerical, dependency-free statistical functions and category-wise
 * Z-score anomaly detection engine for financial transactions.
 * 
 * Mathematical Approach:
 * Transactions -> Group by Category -> Population Mean & Std Dev -> Transaction Z-Score -> Flag Outliers (|Z| >= threshold)
 * 
 * Preserves low-sample (sample size < 2) and zero-variance (stdDev === 0) handling
 * from the canonical KharchaSense anomaly engine to eliminate false positives.
 */

'use strict';

/**
 * Default Z-Score threshold for flagging statistical anomalies.
 * Absolute Z-Score values greater than or equal to this threshold (|Z| >= 2) are classified as anomalies.
 */
const ANOMALY_Z_THRESHOLD = 2;

/**
 * Minimum number of baseline transactions required in a category (excluding the evaluated transaction)
 * to perform reliable statistical anomaly detection.
 */
const MIN_BASELINE_COUNT = 3;

/**
 * Calculates arithmetic mean of an array of numeric values.
 * Safely handles empty arrays, invalid values, symbols, booleans, and non-numeric items.
 *
 * @param {Array<number|string>} values - Array of numeric values or numeric strings.
 * @returns {number} Arithmetic mean of valid values, or 0 if empty/invalid.
 */
function calculateMean(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const validValues = values
    .map(v => (v !== null && v !== undefined && typeof v !== 'symbol' && typeof v !== 'boolean' ? Number(v) : NaN))
    .filter(v => !isNaN(v) && isFinite(v));

  if (validValues.length === 0) {
    return 0;
  }

  const sum = validValues.reduce((acc, curr) => acc + curr, 0);
  return sum / validValues.length;
}

/**
 * Calculates population standard deviation of an array of numbers.
 * Divides sum of squared deviations by N (population size), matching the frontend engine.
 * Safely handles empty arrays, single-item arrays, invalid values, and zero variance.
 *
 * @param {Array<number|string>} values - Array of numeric values or numeric strings.
 * @returns {number} Population standard deviation, or 0 if empty/invalid/zero-variance.
 */
function calculateStandardDeviation(values) {
  if (!Array.isArray(values) || values.length <= 1) {
    return 0;
  }

  const validValues = values
    .map(v => (v !== null && v !== undefined && typeof v !== 'symbol' && typeof v !== 'boolean' ? Number(v) : NaN))
    .filter(v => !isNaN(v) && isFinite(v));

  if (validValues.length <= 1) {
    return 0;
  }

  const mean = calculateMean(validValues);
  const squaredDifferencesSum = validValues.reduce(
    (acc, curr) => acc + Math.pow(curr - mean, 2),
    0
  );
  const variance = squaredDifferencesSum / validValues.length;

  return Math.sqrt(variance);
}

/**
 * Calculates the Z-Score of a given value relative to a mean and standard deviation.
 * Z = (X - μ) / σ
 * Safely handles zero standard deviation, missing inputs, and non-numeric values.
 *
 * @param {number|string} value - The data point value.
 * @param {number|string} mean - The mean of the dataset.
 * @param {number|string} standardDeviation - The standard deviation of the dataset.
 * @returns {number} The calculated Z-Score, or 0 if standard deviation is zero/invalid.
 */
function calculateZScore(value, mean, standardDeviation) {
  if (
    standardDeviation === null ||
    standardDeviation === undefined ||
    typeof standardDeviation === 'symbol' ||
    typeof standardDeviation === 'boolean'
  ) {
    return 0;
  }

  const numStd = Number(standardDeviation);
  if (isNaN(numStd) || !isFinite(numStd) || numStd === 0) {
    return 0;
  }

  if (value === null || value === undefined || typeof value === 'symbol' || typeof value === 'boolean') {
    return 0;
  }
  if (mean === null || mean === undefined || typeof mean === 'symbol' || typeof mean === 'boolean') {
    return 0;
  }

  const numVal = Number(value);
  const numMean = Number(mean);
  if (isNaN(numVal) || !isFinite(numVal) || isNaN(numMean) || !isFinite(numMean)) {
    return 0;
  }

  return (numVal - numMean) / numStd;
}

/**
 * Groups an array of transaction objects by their category.
 * Safely normalizes category names (trims whitespace, defaults to 'Uncategorized').
 * Pure function: does not mutate the input array or objects.
 *
 * @param {Array<Object>} transactions - List of transaction objects.
 * @returns {Object.<string, Array<Object>>} Map of category names to transaction arrays.
 */
function groupByCategory(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {};
  }

  return transactions.reduce((groups, transaction) => {
    if (!transaction || typeof transaction !== 'object') {
      return groups;
    }

    const category = transaction.category && typeof transaction.category === 'string' && transaction.category.trim() !== ''
      ? transaction.category.trim()
      : 'Uncategorized';

    if (!groups[category]) {
      groups[category] = [];
    }

    groups[category].push(transaction);
    return groups;
  }, {});
}

/**
 * Calculates statistical metrics (mean, standard deviation, count, total) for each category.
 * Safely ignores non-numeric amounts.
 *
 * @param {Array<Object>} transactions - List of transaction objects.
 * @returns {Object.<string, { mean: number, rawMean: number, standardDeviation: number, rawStandardDeviation: number, count: number, total: number, validAmounts: number[] }>}
 */
function calculateCategoryStats(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {};
  }

  const grouped = groupByCategory(transactions);
  const stats = {};

  for (const [category, txList] of Object.entries(grouped)) {
    const validAmounts = txList
      .map(t => {
        if (!t || typeof t !== 'object' || t.amount === null || t.amount === undefined || typeof t.amount === 'symbol' || typeof t.amount === 'boolean') {
          return NaN;
        }
        return Number(t.amount);
      })
      .filter(amt => !isNaN(amt) && isFinite(amt));

    const mean = calculateMean(validAmounts);
    const standardDeviation = calculateStandardDeviation(validAmounts);
    const total = validAmounts.reduce((sum, a) => sum + a, 0);

    stats[category] = {
      mean: Number(mean.toFixed(2)),
      rawMean: mean,
      standardDeviation: Number(standardDeviation.toFixed(2)),
      rawStandardDeviation: standardDeviation,
      count: validAmounts.length,
      total: Number(total.toFixed(2)),
      validAmounts
    };
  }

  return stats;
}

/**
 * Detects anomalies in a list of transactions by comparing each transaction
 * against other transactions in the same category using Leave-One-Out (self-excluding)
 * Z-Score statistical analysis.
 *
 * Algorithm Rules:
 * 1. Category-Wise Baseline: Groups expenses strictly by normalized category name.
 * 2. Leave-One-Out Self-Exclusion: When evaluating transaction x_i, x_i is excluded from its category baseline.
 * 3. Minimum Baseline Count: At least 3 other valid transactions (minBaselineCount = 3) are required to form a baseline.
 * 4. Zero Standard Deviation: If baseline standard deviation is 0, avoids division by zero and false positives.
 * 5. Outlier Flagging: Transactions with absolute Z-Score >= threshold (default 2) are flagged as anomalies.
 *
 * @param {Array<Object>} transactions - List of transaction objects.
 * @param {number} [threshold=ANOMALY_Z_THRESHOLD] - Optional Z-Score threshold (default: 2).
 * @param {number} [minBaselineCount=MIN_BASELINE_COUNT] - Minimum baseline count (default: 3).
 * @returns {Array<Object>} Processed transaction objects with anomaly metadata.
 */
function detectAnomalies(transactions, threshold = ANOMALY_Z_THRESHOLD, minBaselineCount = MIN_BASELINE_COUNT) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  const numericThreshold = typeof threshold === 'number' && !isNaN(threshold) && isFinite(threshold)
    ? Math.abs(threshold)
    : ANOMALY_Z_THRESHOLD;

  const minBaseline = typeof minBaselineCount === 'number' && !isNaN(minBaselineCount) && isFinite(minBaselineCount) && minBaselineCount >= 0
    ? minBaselineCount
    : MIN_BASELINE_COUNT;

  // Group valid amounts per category with their original array indices for leave-one-out exclusion
  const categoryValidMap = {};

  transactions.forEach((tx, index) => {
    if (!tx || typeof tx !== 'object') {
      return;
    }

    const isInvalidAmount =
      tx.amount === null ||
      tx.amount === undefined ||
      typeof tx.amount === 'symbol' ||
      typeof tx.amount === 'boolean' ||
      isNaN(Number(tx.amount)) ||
      !isFinite(Number(tx.amount));

    if (isInvalidAmount) {
      return;
    }

    const category = tx.category && typeof tx.category === 'string' && tx.category.trim() !== ''
      ? tx.category.trim()
      : 'Uncategorized';

    if (!categoryValidMap[category]) {
      categoryValidMap[category] = [];
    }

    categoryValidMap[category].push({
      index,
      amount: Number(tx.amount)
    });
  });

  return transactions.map((transaction, index) => {
    // Handle invalid transaction entries
    if (!transaction || typeof transaction !== 'object') {
      return {
        isAnomaly: false,
        zScore: 0,
        categoryMean: 0,
        categoryStandardDeviation: 0,
        anomalyReason: null
      };
    }

    const category = transaction.category && typeof transaction.category === 'string' && transaction.category.trim() !== ''
      ? transaction.category.trim()
      : 'Uncategorized';

    // Validate transaction amount
    const isInvalidAmount =
      transaction.amount === null ||
      transaction.amount === undefined ||
      typeof transaction.amount === 'symbol' ||
      typeof transaction.amount === 'boolean' ||
      isNaN(Number(transaction.amount)) ||
      !isFinite(Number(transaction.amount));

    if (isInvalidAmount) {
      return {
        ...transaction,
        isAnomaly: false,
        zScore: 0,
        categoryMean: 0,
        categoryStandardDeviation: 0,
        anomalyReason: null
      };
    }

    const amount = Number(transaction.amount);
    const categoryEntries = categoryValidMap[category] || [];

    // Leave-one-out self-exclusion: exclude current transaction from its baseline
    const baselineAmounts = categoryEntries
      .filter(entry => entry.index !== index)
      .map(entry => entry.amount);

    // Rule: Insufficient baseline data (< minBaseline other valid transactions)
    if (baselineAmounts.length < minBaseline) {
      const fallbackMean = baselineAmounts.length > 0
        ? Number(calculateMean(baselineAmounts).toFixed(2))
        : amount;

      return {
        ...transaction,
        isAnomaly: false,
        zScore: 0,
        categoryMean: fallbackMean,
        categoryStandardDeviation: 0,
        anomalyReason: null
      };
    }

    // Calculate baseline population mean and standard deviation
    const baselineMeanRaw = calculateMean(baselineAmounts);
    const baselineStdDevRaw = calculateStandardDeviation(baselineAmounts);
    const baselineMean = Number(baselineMeanRaw.toFixed(2));
    const baselineStdDev = Number(baselineStdDevRaw.toFixed(2));

    // Rule: Zero standard deviation (identical amounts in baseline)
    if (baselineStdDevRaw === 0) {
      return {
        ...transaction,
        isAnomaly: false,
        zScore: 0,
        categoryMean: baselineMean,
        categoryStandardDeviation: 0,
        anomalyReason: null
      };
    }

    // Rule: Calculate Z-Score relative to baseline
    const zScoreRaw = calculateZScore(amount, baselineMeanRaw, baselineStdDevRaw);
    const zScore = Number(zScoreRaw.toFixed(2));
    const isAnomaly = Math.abs(zScoreRaw) >= numericThreshold;

    let anomalyReason = null;
    if (isAnomaly) {
      const direction = zScoreRaw > 0 ? 'higher' : 'lower';
      anomalyReason = `Unusually ${direction} expense for "${category}" (₹${amount.toFixed(2)} vs category avg ₹${baselineMean.toFixed(2)}, Z-Score: ${zScore > 0 ? '+' : ''}${zScore.toFixed(2)})`;
    }

    return {
      ...transaction,
      isAnomaly,
      zScore,
      categoryMean: baselineMean,
      categoryStandardDeviation: baselineStdDev,
      anomalyReason
    };
  });
}

/**
 * Counts the total number of anomalous transactions in a dataset.
 * Accepts either pre-analyzed transactions (with `isAnomaly` boolean flag) or raw transactions.
 *
 * @param {Array<Object>} transactions - List of transaction objects.
 * @param {number} [threshold=ANOMALY_Z_THRESHOLD] - Optional Z-Score threshold.
 * @param {number} [minBaselineCount=MIN_BASELINE_COUNT] - Minimum baseline count.
 * @returns {number} The count of anomalous transactions.
 */
function countAnomalies(transactions, threshold = ANOMALY_Z_THRESHOLD, minBaselineCount = MIN_BASELINE_COUNT) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return 0;
  }

  const hasAnomalyFlags = transactions.every(
    t => t && typeof t === 'object' && typeof t.isAnomaly === 'boolean'
  );

  const analyzedList = hasAnomalyFlags
    ? transactions
    : detectAnomalies(transactions, threshold, minBaselineCount);

  return analyzedList.filter(t => Boolean(t?.isAnomaly)).length;
}

/**
 * Filters and returns only the anomalous transactions from a dataset.
 * Accepts either pre-analyzed transactions or raw transactions.
 *
 * @param {Array<Object>} transactions - List of transaction objects.
 * @param {number} [threshold=ANOMALY_Z_THRESHOLD] - Optional Z-Score threshold.
 * @param {number} [minBaselineCount=MIN_BASELINE_COUNT] - Minimum baseline count.
 * @returns {Array<Object>} Array containing only the anomalous transactions.
 */
function getAnomalies(transactions, threshold = ANOMALY_Z_THRESHOLD, minBaselineCount = MIN_BASELINE_COUNT) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  const hasAnomalyFlags = transactions.every(
    t => t && typeof t === 'object' && typeof t.isAnomaly === 'boolean'
  );

  const analyzedList = hasAnomalyFlags
    ? transactions
    : detectAnomalies(transactions, threshold, minBaselineCount);

  return analyzedList.filter(t => Boolean(t?.isAnomaly));
}

/**
 * Generates a comprehensive summary of anomalies across categories and severity levels.
 *
 * @param {Array<Object>} transactions - List of transaction objects.
 * @param {number} [threshold=ANOMALY_Z_THRESHOLD] - Optional Z-Score threshold.
 * @param {number} [minBaselineCount=MIN_BASELINE_COUNT] - Minimum baseline count.
 * @returns {{
 *   totalTransactions: number,
 *   examinedCount: number,
 *   anomalyCount: number,
 *   anomalyRate: number,
 *   anomalies: Array<Object>,
 *   anomaliesByCategory: Object.<string, number>,
 *   byCategory: Object.<string, number>,
 *   bySeverity: { critical: number, moderate: number },
 *   severityBreakdown: { critical: number, moderate: number },
 *   categoryBreakdown: Object.<string, { count: number, totalAnomalousAmount: number, mean: number, standardDeviation: number }>
 * }}
 */
function getAnomalySummary(transactions, threshold = ANOMALY_Z_THRESHOLD, minBaselineCount = MIN_BASELINE_COUNT) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      totalTransactions: 0,
      examinedCount: 0,
      anomalyCount: 0,
      anomalyRate: 0,
      anomalies: [],
      anomaliesByCategory: {},
      byCategory: {},
      bySeverity: { critical: 0, moderate: 0 },
      severityBreakdown: { critical: 0, moderate: 0 },
      categoryBreakdown: {}
    };
  }

  const analyzedList = detectAnomalies(transactions, threshold, minBaselineCount);
  const anomalies = analyzedList.filter(t => Boolean(t.isAnomaly));
  const anomalyCount = anomalies.length;
  const totalTransactions = analyzedList.length;
  const anomalyRate = totalTransactions > 0 ? Number(((anomalyCount / totalTransactions) * 100).toFixed(2)) : 0;

  const anomaliesByCategory = anomalies.reduce((acc, t) => {
    const cat = t.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  // Severity classification:
  // Critical / High: |Z| >= 3.0 (extreme statistical outlier)
  // Moderate / Medium: 2.0 <= |Z| < 3.0 (standard anomaly)
  const critical = anomalies.filter(t => Math.abs(Number(t.zScore) || 0) >= 3.0).length;
  const moderate = anomalies.filter(t => {
    const absZ = Math.abs(Number(t.zScore) || 0);
    return absZ >= 2.0 && absZ < 3.0;
  }).length;

  const severityBreakdown = {
    critical,
    moderate
  };

  // Detailed breakdown per category with anomalies
  const categoryBreakdown = {};
  for (const anom of anomalies) {
    const cat = anom.category || 'Uncategorized';
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = {
        count: 0,
        totalAnomalousAmount: 0,
        mean: anom.categoryMean || 0,
        standardDeviation: anom.categoryStandardDeviation || 0
      };
    }
    categoryBreakdown[cat].count += 1;
    categoryBreakdown[cat].totalAnomalousAmount = Number(
      (categoryBreakdown[cat].totalAnomalousAmount + (Number(anom.amount) || 0)).toFixed(2)
    );
  }

  return {
    totalTransactions,
    examinedCount: totalTransactions,
    anomalyCount,
    anomalyRate,
    anomalies,
    anomaliesByCategory,
    byCategory: anomaliesByCategory,
    bySeverity: severityBreakdown,
    severityBreakdown,
    categoryBreakdown
  };
}

module.exports = {
  ANOMALY_Z_THRESHOLD,
  MIN_BASELINE_COUNT,
  calculateMean,
  calculateStandardDeviation,
  calculateZScore,
  groupByCategory,
  calculateCategoryStats,
  getCategoryStatistics: calculateCategoryStats,
  detectAnomalies,
  identifyAnomalies: detectAnomalies,
  detectCategoryAnomalies: detectAnomalies,
  countAnomalies,
  getAnomalyCount: countAnomalies,
  getAnomalies,
  filterAnomalies: getAnomalies,
  getAnomalySummary
};

