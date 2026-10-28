/**
 * analyticsApiClient.js — Client Service for Backend Analytics & Anomaly Endpoints
 *
 * Responsibilities:
 *   - Fetch summary, categories, trends, recurring metrics, and anomalies from Express backend.
 *   - Pass active date range (from/to) query parameters.
 *   - Use apiClient for JWT token injection.
 *   - Prevent stale asynchronous responses using monotonic sequence tracking.
 *   - Expose unified fetchAllDashboardAnalytics for atomic dashboard state synchronization.
 */

import { get } from './apiClient.js';
import { isAuthenticated } from './authService.js';

let _currentRequestId = 0;

/**
 * Convert Date or YYYY-MM-DD string to valid query param object
 * @param {object} [dateRange]
 * @returns {Record<string, string>}
 */
function buildDateQueryParams(dateRange = {}) {
    const params = {};
    if (dateRange && dateRange.type !== 'all') {
        if (dateRange.startDate) {
            params.from = dateRange.startDate.trim();
        }
        if (dateRange.endDate) {
            params.to = dateRange.endDate.trim();
        }
    }
    return params;
}

function toQueryString(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
            searchParams.append(k, v);
        }
    });
    const qs = searchParams.toString();
    return qs ? `?${qs}` : '';
}

/**
 * Fetch overall spending summary metrics from backend.
 * GET /api/analytics/summary
 */
export async function fetchAnalyticsSummary(dateRange) {
    const qs = toQueryString(buildDateQueryParams(dateRange));
    const res = await get(`/api/analytics/summary${qs}`);
    return res?.data || null;
}

/**
 * Fetch category-wise breakdown and totals from backend.
 * GET /api/analytics/categories
 */
export async function fetchAnalyticsCategories(dateRange) {
    const qs = toQueryString(buildDateQueryParams(dateRange));
    const res = await get(`/api/analytics/categories${qs}`);
    return res?.data || null;
}

/**
 * Fetch daily chronological spending trends from backend.
 * GET /api/analytics/trends
 */
export async function fetchAnalyticsTrends(dateRange) {
    const qs = toQueryString(buildDateQueryParams(dateRange));
    const res = await get(`/api/analytics/trends${qs}`);
    return res?.data || null;
}

/**
 * Fetch recurring vs one-off spending distribution from backend.
 * GET /api/analytics/recurring
 */
export async function fetchAnalyticsRecurring(dateRange) {
    const qs = toQueryString(buildDateQueryParams(dateRange));
    const res = await get(`/api/analytics/recurring${qs}`);
    return res?.data || null;
}

/**
 * Fetch list of flagged anomalous transactions from backend.
 * GET /api/anomalies?flaggedOnly=true
 */
export async function fetchAnomalies(dateRange, flaggedOnly = true) {
    const params = buildDateQueryParams(dateRange);
    params.flaggedOnly = String(Boolean(flaggedOnly));
    const qs = toQueryString(params);
    const res = await get(`/api/anomalies${qs}`);
    return res?.data || null;
}

/**
 * Fetch statistical anomaly summary from backend.
 * GET /api/anomalies/summary
 */
export async function fetchAnomalySummary(dateRange) {
    const qs = toQueryString(buildDateQueryParams(dateRange));
    const res = await get(`/api/anomalies/summary${qs}`);
    return res?.data || null;
}

/**
 * Fetch all backend analytics and anomaly datasets in parallel.
 * Enforces race-condition protection: discards responses if a newer request has started.
 *
 * @param {object} [dateRange]
 * @returns {Promise<{ isCurrent: boolean, summary: object, categories: object, trends: object, recurring: object, anomalies: object, anomalySummary: object } | null>}
 */
export async function fetchAllDashboardAnalytics(dateRange) {
    if (!isAuthenticated()) {
        return null;
    }

    const requestId = ++_currentRequestId;

    try {
        const [summary, categories, trends, recurring, anomalies, anomalySummary] = await Promise.all([
            fetchAnalyticsSummary(dateRange),
            fetchAnalyticsCategories(dateRange),
            fetchAnalyticsTrends(dateRange),
            fetchAnalyticsRecurring(dateRange),
            fetchAnomalies(dateRange, true),
            fetchAnomalySummary(dateRange)
        ]);

        // Race-condition guard: check if another request superseded this one
        if (requestId !== _currentRequestId) {
            return { isCurrent: false };
        }

        return {
            isCurrent: true,
            summary,
            categories,
            trends,
            recurring,
            anomalies,
            anomalySummary
        };
    } catch (err) {
        if (requestId !== _currentRequestId) {
            return { isCurrent: false };
        }
        throw err;
    }
}
