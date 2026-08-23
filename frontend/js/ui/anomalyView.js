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
        <div class="anomaly-hero-card">
            <div class="anomaly-hero-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
            </div>
            <div class="anomaly-hero-text">
                <h2 class="anomaly-hero-title">Expense Intelligence</h2>
                <p class="anomaly-hero-desc">Statistical outlier detection and pattern analysis across all expense categories.</p>
            </div>
            <div class="anomaly-hero-badge anomaly-hero-badge--good">
                <span class="status-pulse-dot" style="background:#5BC236;"></span>
                <span>System Active</span>
            </div>
        </div>

        <div class="anomaly-stats-row">
            <div class="anomaly-stat-card">
                <div class="asc-top">
                    <span class="asc-icon-wrap asc-icon-wrap--good">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    </span>
                    <span class="asc-label">Anomalies Detected</span>
                </div>
                <div class="asc-value asc-value--good">0</div>
                <div class="asc-sub">0 total transactions</div>
            </div>

            <div class="anomaly-stat-card">
                <div class="asc-top">
                    <span class="asc-icon-wrap asc-icon-wrap--good">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                    </span>
                    <span class="asc-label">Anomaly Rate</span>
                </div>
                <div class="asc-value asc-value--good">0.00%</div>
                <div class="asc-sub">of recorded expenses</div>
            </div>

            <div class="anomaly-stat-card">
                <div class="asc-top">
                    <span class="asc-icon-wrap asc-icon-wrap--good">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                            <line x1="7" y1="7" x2="7.01" y2="7"/>
                        </svg>
                    </span>
                    <span class="asc-label">Categories Affected</span>
                </div>
                <div class="asc-value asc-value--good">0</div>
                <div class="asc-sub">categories with outliers</div>
            </div>
        </div>
    `;
}

function _buildStatCards(summary, categoriesAffected) {
    const rateStr = summary.anomalyRate.toFixed(2);
    const hasAnomalies = summary.anomalyCount > 0;

    const heroBadgeClass = hasAnomalies ? 'anomaly-hero-badge anomaly-hero-badge--alert' : 'anomaly-hero-badge anomaly-hero-badge--good';
    const heroBadgeText  = hasAnomalies ? `${summary.anomalyCount} Outlier${summary.anomalyCount !== 1 ? 's' : ''} Flagged` : 'All Normal';
    const heroDotColor   = hasAnomalies ? '#d95b52' : '#5BC236';

    const iconClass = hasAnomalies ? 'asc-icon-wrap asc-icon-wrap--danger' : 'asc-icon-wrap asc-icon-wrap--good';
    const valClass  = hasAnomalies ? 'asc-value asc-value--danger'          : 'asc-value asc-value--good';

    return `
        <div class="anomaly-hero-card">
            <div class="anomaly-hero-icon ${hasAnomalies ? 'anomaly-hero-icon--alert' : ''}" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
            </div>
            <div class="anomaly-hero-text">
                <h2 class="anomaly-hero-title">Expense Intelligence</h2>
                <p class="anomaly-hero-desc">
                    ${hasAnomalies
                        ? `Found ${summary.anomalyCount} transaction${summary.anomalyCount !== 1 ? 's' : ''} deviating significantly from category spending baselines.`
                        : 'Continuous statistical analysis across all recorded categories. No abnormal outliers detected.'}
                </p>
            </div>
            <div class="${heroBadgeClass}">
                <span class="status-pulse-dot" style="background:${heroDotColor};"></span>
                <span>${heroBadgeText}</span>
            </div>
        </div>

        <div class="anomaly-stats-row">
            <div class="anomaly-stat-card">
                <div class="asc-top">
                    <span class="${iconClass}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    </span>
                    <span class="asc-label">Anomalies Detected</span>
                </div>
                <div class="${valClass}">${summary.anomalyCount}</div>
                <div class="asc-sub">of ${summary.totalTransactions} transaction${summary.totalTransactions !== 1 ? 's' : ''}</div>
            </div>

            <div class="anomaly-stat-card">
                <div class="asc-top">
                    <span class="${iconClass}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                    </span>
                    <span class="asc-label">Anomaly Rate</span>
                </div>
                <div class="${valClass}">${rateStr}%</div>
                <div class="asc-sub">of all recorded expenses</div>
            </div>

            <div class="anomaly-stat-card">
                <div class="asc-top">
                    <span class="${iconClass}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                            <line x1="7" y1="7" x2="7.01" y2="7"/>
                        </svg>
                    </span>
                    <span class="asc-label">Categories Affected</span>
                </div>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="#5BC236" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
            </div>
            <h3 class="anomaly-empty-title">Everything looks normal</h3>
            <p class="anomaly-empty-desc">
                No unusual spending patterns were detected across your expense categories.
                The anomaly detection engine automatically computes Z-Scores (threshold ≥ 2.0σ) to flag outliers when new entries are recorded.
            </p>
            <span class="anomaly-empty-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M9 12l2 2 4-4"/></svg>
                All spending patterns within normal range
            </span>
        </div>
    `;
}

function _buildAnomalyList(anomalies) {
    // Sort by absolute Z-Score descending (most severe deviation first)
    const sorted = [...anomalies].sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

    const items = sorted.map((tx, idx) => {
        const displayDate = formatDate(tx.date, 'medium') || tx.date || '--';
        const zVal        = Number(tx.zScore || 0);
        const zStr        = (zVal > 0 ? '+' : '') + zVal.toFixed(2);
        const title       = _esc(tx.title || 'Untitled');
        const category    = _esc(tx.category || '--');
        const avgAmt      = formatCurrency(tx.categoryMean || 0);

        return `
            <div class="anomaly-tx-card" style="animation-delay:${idx * 0.05}s">
                <div class="atc-left">
                    <div class="atc-icon-badge" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    </div>
                    <div class="atc-info">
                        <div class="atc-title-row">
                            <span class="atc-title">${title}</span>
                            <span class="badge badge-anomaly">⚠ Outlier</span>
                        </div>
                        <div class="atc-meta">${category} · ${displayDate} · Category Avg: ${avgAmt}</div>
                        ${tx.anomalyReason ? `
                            <p class="atc-explanation">${_esc(tx.anomalyReason)}</p>
                        ` : `
                            <p class="atc-explanation">${formatCurrency(tx.amount)} is statistically unusual compared to the ${category} category average of ${avgAmt}.</p>
                        `}
                    </div>
                </div>
                <div class="atc-right">
                    <span class="atc-amount">${formatCurrency(tx.amount)}</span>
                    <span class="atc-zscore-badge" title="Statistical standard deviation score">
                        Z-Score: ${zStr}
                    </span>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="anomaly-list-header">
            <div>
                <h3 class="chart-card-title">${anomalies.length} Flagged Transaction${anomalies.length !== 1 ? 's' : ''}</h3>
                <span class="chart-card-desc">Ranked by statistical deviation from category baseline</span>
            </div>
            <span class="atc-zscore-badge" style="background:#fdf2f1;color:var(--danger);border:1px solid rgba(217,91,82,0.14);">⚠ ${anomalies.length} Outlier${anomalies.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="anomaly-cards-grid">
            ${items}
        </div>
    `;
}

function _buildHowItWorks() {
    return `
        <div class="how-it-works-card">
            <div class="hiw-header">
                <div class="hiw-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                </div>
                <div>
                    <h3 class="chart-card-title">How Anomaly Detection Works</h3>
                    <span class="chart-card-desc">Transparent statistical outlier model (Z-Score ≥ 2.0σ)</span>
                </div>
            </div>
            <div class="hiw-grid">
                <div class="hiw-step-card">
                    <span class="hiw-step-num">1</span>
                    <h4 class="hiw-step-title">Category Grouping</h4>
                    <p class="hiw-step-desc">Transactions are grouped by category to evaluate peer spending patterns within a shared context.</p>
                </div>
                <div class="hiw-step-card">
                    <span class="hiw-step-num">2</span>
                    <h4 class="hiw-step-title">Mean Calculation</h4>
                    <p class="hiw-step-desc">The average spend (μ) is calculated per category using all transactions in that group.</p>
                </div>
                <div class="hiw-step-card">
                    <span class="hiw-step-num">3</span>
                    <h4 class="hiw-step-title">Std. Deviation</h4>
                    <p class="hiw-step-desc">Standard deviation (σ) is computed to measure how spread out the spending values are within each category.</p>
                </div>
                <div class="hiw-step-card">
                    <span class="hiw-step-num">4</span>
                    <h4 class="hiw-step-title">Z-Score Formula</h4>
                    <p class="hiw-step-desc">Z = (x − μ) / σ calculates how many standard deviations a specific amount sits from the category normal.</p>
                </div>
                <div class="hiw-step-card">
                    <span class="hiw-step-num">5</span>
                    <h4 class="hiw-step-title">Outlier Flagging</h4>
                    <p class="hiw-step-desc">Transactions where |Z| ≥ 2.0 are flagged as anomalies with contextual statistical explanations.</p>
                </div>
            </div>
        </div>
    `;
}
