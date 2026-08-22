/**
 * anomalyView.js — Anomaly Insights Section UI Module
 *
 * Renders the full Anomaly Insights dashboard section with:
 *   - 3 stat cards (total anomalies, anomaly rate %, categories affected)
 *   - Anomaly transaction list with full detail for each flagged tx
 *   - Empty state when no anomalies exist
 *   - "How Anomaly Detection Works" informational panel
 *
 * Exports:
 *   initAnomalyView()                        — Reset to empty/default state.
 *   updateAnomalyView(transactions, analyzed) — Full re-render with real data.
 *
 * This module is purely presentational.
 * Anomaly data comes from detectAnomalies() output — `analyzed[]`.
 * Explanation text (`anomalyReason`) is authored by anomalyService.js.
 */

import { getAnomalySummary } from '../services/anomalyService.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

// ─── Element IDs ──────────────────────────────────────────────────────────────

const IDS = {
    statCards:     'anomaly-stat-cards',
    list:          'anomaly-list',
    howItWorks:    'anomaly-how-it-works',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function el(id)         { return document.getElementById(id); }
function html(id, markup) {
    const node = el(id);
    if (node) node.innerHTML = markup;
}
function _esc(str) {
    return String(str ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Reset the Anomaly Insights section to its initial empty state.
 * Called once during app boot.
 */
export function initAnomalyView() {
    html(IDS.statCards,  _buildEmptyStats());
    html(IDS.list,       _buildEmptyAnomalyList());
    html(IDS.howItWorks, _buildHowItWorks());
}

/**
 * Re-render the full Anomaly Insights section with current data.
 * Called inside refreshApp() on every add / delete / boot.
 *
 * @param {Array<object>} transactions — Raw transactions from the store.
 * @param {Array<object>} analyzed     — Anomaly-enriched transactions from detectAnomalies().
 */
export function updateAnomalyView(transactions, analyzed) {
    if (!Array.isArray(analyzed)) analyzed = [];

    // getAnomalySummary re-uses already-detected data by checking for isAnomaly flags
    const summary = getAnomalySummary(analyzed);

    const categoriesAffected = Object.keys(summary.anomaliesByCategory).length;

    // ── 1. Stat cards ──
    html(IDS.statCards, _buildStatCards(summary, categoriesAffected));

    // ── 2. Anomaly list or empty state ──
    if (summary.anomalyCount === 0) {
        html(IDS.list, _buildEmptyAnomalyList());
    } else {
        html(IDS.list, _buildAnomalyList(summary.anomalies));
    }

    // ── 3. How it works panel (static — always shown) ──
    html(IDS.howItWorks, _buildHowItWorks());
}

// ─── Private builders ─────────────────────────────────────────────────────────

function _buildEmptyStats() {
    return `
        <div class="anomaly-stat-card">
            <div class="asc-icon-wrap asc-icon-wrap--neutral">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
            </div>
            <div class="asc-body">
                <div class="asc-label">Anomalies Detected</div>
                <div class="asc-value">0</div>
            </div>
        </div>
        <div class="anomaly-stat-card">
            <div class="asc-icon-wrap asc-icon-wrap--neutral">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
            </div>
            <div class="asc-body">
                <div class="asc-label">Anomaly Rate</div>
                <div class="asc-value">0.00%</div>
            </div>
        </div>
        <div class="anomaly-stat-card">
            <div class="asc-icon-wrap asc-icon-wrap--neutral">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
            </div>
            <div class="asc-body">
                <div class="asc-label">Categories Affected</div>
                <div class="asc-value">0</div>
            </div>
        </div>
    `;
}

function _buildStatCards(summary, categoriesAffected) {
    const rateStr = summary.anomalyRate.toFixed(2);
    const hasAnomalies = summary.anomalyCount > 0;

    const cardClass = hasAnomalies ? 'anomaly-stat-card anomaly-stat-card--alert' : 'anomaly-stat-card';
    const iconClass  = hasAnomalies ? 'asc-icon-wrap asc-icon-wrap--danger'        : 'asc-icon-wrap asc-icon-wrap--good';
    const valClass   = hasAnomalies ? 'asc-value asc-value--danger'                 : 'asc-value asc-value--good';

    return `
        <div class="${cardClass}">
            <div class="${iconClass}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
            </div>
            <div class="asc-body">
                <div class="asc-label">Anomalies Detected</div>
                <div class="${valClass}">${summary.anomalyCount}</div>
                <div class="asc-sub">of ${summary.totalTransactions} transaction${summary.totalTransactions !== 1 ? 's' : ''}</div>
            </div>
        </div>

        <div class="anomaly-stat-card">
            <div class="${iconClass}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                </svg>
            </div>
            <div class="asc-body">
                <div class="asc-label">Anomaly Rate</div>
                <div class="${valClass}">${rateStr}%</div>
                <div class="asc-sub">of all recorded transactions</div>
            </div>
        </div>

        <div class="anomaly-stat-card">
            <div class="${iconClass}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
            </div>
            <div class="asc-body">
                <div class="asc-label">Categories Affected</div>
                <div class="${valClass}">${categoriesAffected}</div>
                <div class="asc-sub">spending ${categoriesAffected === 1 ? 'category' : 'categories'} with outliers</div>
            </div>
        </div>
    `;
}

function _buildEmptyAnomalyList() {
    return `
        <div class="anomaly-empty-state">
            <div class="anomaly-empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                     stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
            </div>
            <h3 class="anomaly-empty-title">No unusual spending patterns detected</h3>
            <p class="anomaly-empty-desc">
                Your transactions look normal. Anomalies appear when a transaction in a category
                significantly deviates from the average for that category.
                Add more transactions across the same category to enable detection.
            </p>
        </div>
    `;
}

function _buildAnomalyList(anomalies) {
    // Sort by absolute Z-Score descending (most extreme first)
    const sorted = [...anomalies].sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

    const items = sorted.map((tx, idx) => {
        const displayDate = formatDate(tx.date, 'medium') || tx.date || '--';
        const zAbs        = Math.abs(tx.zScore || 0);
        const direction   = (tx.zScore || 0) > 0 ? 'above' : 'below';
        const severity    = zAbs >= 3 ? 'high' : 'medium';
        const title       = _esc(tx.title || 'Untitled');
        const category    = _esc(tx.category || '--');

        return `
            <div class="anomaly-item anomaly-item--${severity}" style="animation-delay:${idx * 0.06}s">
                <div class="anomaly-item-header">
                    <div class="anomaly-item-left">
                        <span class="anomaly-item-icon" aria-hidden="true">⚠</span>
                        <div class="anomaly-item-info">
                            <span class="anomaly-item-title">${title}</span>
                            <span class="anomaly-item-meta">${category} · ${displayDate}</span>
                        </div>
                    </div>
                    <div class="anomaly-item-right">
                        <span class="anomaly-item-amount">${formatCurrency(tx.amount)}</span>
                        <span class="badge badge-anomaly">Anomaly</span>
                    </div>
                </div>
                <div class="anomaly-item-detail">
                    <div class="anomaly-item-zscore">
                        <span class="zscore-label">Z-Score</span>
                        <span class="zscore-value zscore-value--${direction === 'above' ? 'high' : 'low'}">
                            ${(tx.zScore || 0) > 0 ? '+' : ''}${(tx.zScore || 0).toFixed(2)}
                        </span>
                    </div>
                    <div class="anomaly-item-stats">
                        <span>Category avg: ${formatCurrency(tx.categoryMean || 0)}</span>
                        <span class="anomaly-dot" aria-hidden="true">·</span>
                        <span>This tx is ${direction} average</span>
                    </div>
                    ${tx.anomalyReason ? `
                        <div class="anomaly-item-reason">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                 stroke-linecap="round" stroke-linejoin="round" class="reason-icon" aria-hidden="true">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            ${_esc(tx.anomalyReason)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="anomaly-list-header">
            <h3 class="anomaly-list-title">
                ${anomalies.length} Flagged Transaction${anomalies.length !== 1 ? 's' : ''}
            </h3>
            <span class="anomaly-list-sub">Sorted by deviation severity</span>
        </div>
        <div class="anomaly-list-items">
            ${items}
        </div>
    `;
}

function _buildHowItWorks() {
    return `
        <div class="how-it-works-card">
            <div class="hiw-header">
                <div class="hiw-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
                         stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                </div>
                <h3 class="hiw-title">How Anomaly Detection Works</h3>
            </div>
            <div class="hiw-body">
                <p>
                    This application uses <strong>category-based statistical analysis</strong>
                    to identify unusual transactions in your spending history.
                </p>
                <ol class="hiw-steps">
                    <li>
                        <span class="hiw-step-num">1</span>
                        <span><strong>Group by category</strong> — Transactions are grouped
                        by their spending category (e.g., Groceries, Subscriptions).</span>
                    </li>
                    <li>
                        <span class="hiw-step-num">2</span>
                        <span><strong>Calculate baseline</strong> — The mean and standard
                        deviation of all amounts within each category are computed.</span>
                    </li>
                    <li>
                        <span class="hiw-step-num">3</span>
                        <span><strong>Compute Z-Score</strong> — Each transaction is compared
                        to its category baseline using a Z-Score, which measures how many
                        standard deviations it falls from the category average.</span>
                    </li>
                    <li>
                        <span class="hiw-step-num">4</span>
                        <span><strong>Flag outliers</strong> — Transactions with an absolute
                        Z-Score of <strong>2 or greater</strong> are flagged as anomalies.
                        A minimum of 2 transactions per category is required before detection
                        activates.</span>
                    </li>
                </ol>
                <p class="hiw-note">
                    ℹ️ No machine learning is used. The detection is fully transparent and
                    based on classical statistical methods.
                </p>
            </div>
        </div>
    `;
}
