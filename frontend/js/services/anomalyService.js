/**
 * Anomaly Detection Service - Day 1 Statistical Helpers
 * 
 * Provides reusable, dependency-free statistical functions for calculating
 * mean, standard deviation, and Z-Scores to support anomaly detection.
 */

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

    const sum = values.reduce((acc, curr) => acc + Number(curr), 0);
    return sum / values.length;
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

    const mean = calculateMean(values);
    const squaredDifferencesSum = values.reduce(
        (acc, curr) => acc + Math.pow(Number(curr) - mean, 2),
        0
    );
    const variance = squaredDifferencesSum / values.length;

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
    if (!standardDeviation || Number(standardDeviation) === 0) {
        return 0;
    }

    return (Number(value) - Number(mean)) / Number(standardDeviation);
}
