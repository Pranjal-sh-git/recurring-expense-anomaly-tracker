/**
 * Anomaly Detection Service
 * 
 * Provides reusable, dependency-free statistical functions and transaction
 * anomaly detection logic using Z-Score statistical analysis.
 * Phase 1 - Day 1 & Day 2 Foundation
 */

/**
 * Standard Z-Score threshold for flagging statistical anomalies.
 * Absolute Z-Score values greater than this threshold are considered anomalies.
 */
export const ANOMALY_Z_THRESHOLD = 2;

/**
 * Calculates the arithmetic mean of an array of numbers.
 *
 * @param {number[]} values - Array of numerical values.
 * @returns {number} The arithmetic mean of the values, or 0 if empty/invalid.
 */
export function calculateMean(values) {
    if (!Array.isArray(values) || values.length === 0) {
        return 0;
    }

    const validValues = values.map(v => Number(v)).filter(v => !isNaN(v));
    if (validValues.length === 0) {
        return 0;
    }

    const sum = validValues.reduce((acc, curr) => acc + curr, 0);
    return sum / validValues.length;
}

/**
 * Calculates the population standard deviation of an array of numbers manually.
 *
 * @param {number[]} values - Array of numerical values.
 * @returns {number} The standard deviation of the values, or 0 if empty/invalid.
 */
export function calculateStandardDeviation(values) {
    if (!Array.isArray(values) || values.length === 0) {
        return 0;
    }

    const validValues = values.map(v => Number(v)).filter(v => !isNaN(v));
    if (validValues.length === 0) {
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
 * Safely handles cases where the standard deviation is zero.
 *
 * @param {number} value - The data point value.
 * @param {number} mean - The mean of the dataset.
 * @param {number} standardDeviation - The standard deviation of the dataset.
 * @returns {number} The calculated Z-Score, or 0 if standard deviation is zero/invalid.
 */
export function calculateZScore(value, mean, standardDeviation) {
    const numStd = Number(standardDeviation);
    if (!numStd || isNaN(numStd) || numStd === 0) {
        return 0;
    }

    const numVal = Number(value);
    const numMean = Number(mean);
    if (isNaN(numVal) || isNaN(numMean)) {
        return 0;
    }

    return (numVal - numMean) / numStd;
}

/**
 * Detects anomalies in a list of transactions based on amount Z-Scores.
 * A transaction is marked as an anomaly when its absolute Z-Score is strictly greater than 2.
 * Pure function: does not mutate the original transactions array or objects.
 *
 * @param {Array<Object>} transactions - List of transaction objects ({ id, title, amount, category, date }).
 * @param {number} [threshold=ANOMALY_Z_THRESHOLD] - Optional Z-Score threshold for anomaly cutoff.
 * @returns {Array<Object>} New array of transaction objects containing `isAnomaly` and `zScore`.
 */
export function detectAnomalies(transactions, threshold = ANOMALY_Z_THRESHOLD) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
        return [];
    }

    // Extract numerical amounts safely
    const amounts = transactions.map(t => {
        if (!t || typeof t !== 'object') {
            return 0;
        }
        const amt = Number(t.amount);
        return isNaN(amt) ? 0 : amt;
    });

    const mean = calculateMean(amounts);
    const standardDeviation = calculateStandardDeviation(amounts);

    return transactions.map((transaction, index) => {
        if (!transaction || typeof transaction !== 'object') {
            return {
                isAnomaly: false,
                zScore: 0
            };
        }

        const amount = amounts[index];
        const zScore = calculateZScore(amount, mean, standardDeviation);
        const isAnomaly = Math.abs(zScore) > threshold;

        return {
            ...transaction,
            isAnomaly,
            zScore
        };
    });
}

/**
 * Counts the total number of anomalous transactions in a dataset.
 * Accepts either pre-analyzed transactions (with `isAnomaly` flag) or raw transactions.
 *
 * @param {Array<Object>} transactions - List of transaction objects.
 * @param {number} [threshold=ANOMALY_Z_THRESHOLD] - Optional Z-Score threshold.
 * @returns {number} The count of anomalous transactions.
 */
export function countAnomalies(transactions, threshold = ANOMALY_Z_THRESHOLD) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
        return 0;
    }

    // If already analyzed (all items have boolean isAnomaly property), use existing flags
    const hasAnomalyFlags = transactions.every(
        t => t && typeof t === 'object' && typeof t.isAnomaly === 'boolean'
    );

    const analyzedList = hasAnomalyFlags
        ? transactions
        : detectAnomalies(transactions, threshold);

    return analyzedList.filter(t => Boolean(t?.isAnomaly)).length;
}

// Aliases for convenience and flexible naming conventions
export const getAnomalyCount = countAnomalies;
export const identifyAnomalies = detectAnomalies;

export default {
    ANOMALY_Z_THRESHOLD,
    calculateMean,
    calculateStandardDeviation,
    calculateZScore,
    detectAnomalies,
    identifyAnomalies,
    countAnomalies,
    getAnomalyCount
};
