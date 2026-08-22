/**
 * analyticsView.js — Analytics Section UI Module
 *
 * Renders the full Analytics dashboard section with:
 *   - Summary metric cards (total, avg, top category, recurring spend)
 *   - Daily Spending Trend chart (Analytics-specific container)
 *   - Category Breakdown chart (Analytics-specific container)
 *   - Recurring vs One-off visual bar
 *   - Category Insights table (sorted by total desc, with % of total)
 *
 * Exports:
 *   initAnalyticsView()                        — Reset to empty/default state.
 *   updateAnalyticsView(transactions, analyzed) — Full re-render with real data.
 *
 * This module is purely presentational.
 * All calculations use existing service functions — nothing is hardcoded.
 */

import {
    calculateTotalExpenses,
    calculateTotalTransactions,
    calculateCategoryTotals,
    getHighestSpendingCategory,
} from '../analytics/analyticsService.js';

import {
    renderCategorySpendingChart,
    renderDailySpendingChart,
} from '../analytics/charts.js';

import { formatCurrency } from '../utils/formatters.js';

// ─── Element IDs ──────────────────────────────────────────────────────────────

const IDS = {
    summaryCards:  'analytics-summary-cards',
    dailyChart:    'analytics-daily-chart',
    categoryChart: 'analytics-category-chart',
    recurringBar:  'analytics-recurring-bar',
    categoryTable: 'analytics-category-table',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function el(id) {
    return document.getElementById(id);
}

function html(id, markup) {
    const node = el(id);
    if (node) node.innerHTML = markup;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Reset the Analytics section to its initial empty state.
 * Called once during app boot before any data is loaded.
 */
export function initAnalyticsView() {
    html(IDS.summaryCards,  _buildEmptyCards());
    html(IDS.recurringBar,  _buildRecurringBarEmpty());
    html(IDS.categoryTable, _buildTableEmpty());
    // Charts render their own empty states via charts.js fallback
}

/**
 * Re-render the full Analytics section with current data.
 * Called inside refreshApp() after every add / delete / boot.
 *
 * @param {Array<object>} transactions — Raw transactions from the store.
 * @param {Array<object>} analyzed     — Anomaly-enriched transactions (from detectAnomalies).
 */
export function updateAnalyticsView(transactions, analyzed) {
    if (!Array.isArray(transactions)) transactions = [];
    if (!Array.isArray(analyzed))     analyzed     = [];

    const total       = calculateTotalExpenses(transactions);
    const count       = calculateTotalTransactions(transactions);
    const avgAmount   = count > 0 ? total / count : 0;
    const topCat      = getHighestSpendingCategory(transactions);
    const catTotals   = calculateCategoryTotals(transactions);

    // Recurring stats
    const recurringTxs    = transactions.filter(t => Boolean(t.recurring));
    const recurringSpend  = recurringTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const recurringCount  = recurringTxs.length;
    const oneOffSpend     = Math.max(0, total - recurringSpend);
    const recurringPct    = total > 0 ? (recurringSpend / total) * 100 : 0;

    // ── 1. Summary cards ──
    html(IDS.summaryCards, _buildSummaryCards({
        total, count, avgAmount, topCat, recurringSpend, recurringCount,
    }));

    // ── 2. Charts (Analytics-specific containers) ──
    renderDailySpendingChart(IDS.dailyChart,    transactions);
    renderCategorySpendingChart(IDS.categoryChart, transactions, {
        type: 'bar',
        chartOptions: {
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { callback: v => formatCurrency(v) },
                },
            },
        },
    });

    // ── 3. Recurring vs One-off bar ──
    html(IDS.recurringBar, _buildRecurringBar({
        recurringSpend, oneOffSpend, recurringPct, recurringCount,
        oneOffCount: count - recurringCount, total,
    }));

    // ── 4. Category insights table ──
    html(IDS.categoryTable, _buildCategoryTable(catTotals, total));
}

// ─── Private builders ─────────────────────────────────────────────────────────

function _buildEmptyCards() {
    return `
        <div class="analytics-metric-card">
            <div class="amc-label">Total Spending</div>
            <div class="amc-value">₹0.00</div>
            <div class="amc-sub">No transactions yet</div>
        </div>
        <div class="analytics-metric-card">
            <div class="amc-label">Average Transaction</div>
            <div class="amc-value">₹0.00</div>
            <div class="amc-sub">Per entry</div>
        </div>
        <div class="analytics-metric-card">
            <div class="amc-label">Top Category</div>
            <div class="amc-value amc-value--sm">--</div>
            <div class="amc-sub">Highest spending area</div>
        </div>
        <div class="analytics-metric-card">
            <div class="amc-label">Recurring Spend</div>
            <div class="amc-value">₹0.00</div>
            <div class="amc-sub">0 recurring entries</div>
        </div>
    `;
}

function _buildSummaryCards({ total, count, avgAmount, topCat, recurringSpend, recurringCount }) {
    const topCatName = topCat ? topCat.category : '--';
    const topCatAmt  = topCat ? formatCurrency(topCat.amount) : '';

    return `
        <div class="analytics-metric-card">
            <div class="amc-icon-row">
                <span class="amc-icon amc-icon--indigo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"/>
                        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                    </svg>
                </span>
                <span class="amc-label">Total Spending</span>
            </div>
            <div class="amc-value amc-value--indigo">${formatCurrency(total)}</div>
            <div class="amc-sub">${count} transaction${count !== 1 ? 's' : ''} recorded</div>
        </div>

        <div class="analytics-metric-card">
            <div class="amc-icon-row">
                <span class="amc-icon amc-icon--blue">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                    </svg>
                </span>
                <span class="amc-label">Average Transaction</span>
            </div>
            <div class="amc-value">${formatCurrency(avgAmount)}</div>
            <div class="amc-sub">Per recorded entry</div>
        </div>

        <div class="analytics-metric-card">
            <div class="amc-icon-row">
                <span class="amc-icon amc-icon--purple">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                </span>
                <span class="amc-label">Top Category</span>
            </div>
            <div class="amc-value amc-value--sm">${topCatName}</div>
            <div class="amc-sub">${topCatAmt ? topCatAmt + ' total spend' : 'No data yet'}</div>
        </div>

        <div class="analytics-metric-card">
            <div class="amc-icon-row">
                <span class="amc-icon amc-icon--green">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="23 4 23 10 17 10"/>
                        <polyline points="1 20 1 14 7 14"/>
                        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                    </svg>
                </span>
                <span class="amc-label">Recurring Spend</span>
            </div>
            <div class="amc-value amc-value--green">${formatCurrency(recurringSpend)}</div>
            <div class="amc-sub">${recurringCount} recurring entr${recurringCount !== 1 ? 'ies' : 'y'}</div>
        </div>
    `;
}

function _buildRecurringBarEmpty() {
    return `
        <div class="recurring-bar-wrap">
            <div class="recurring-bar-header">
                <span class="recurring-bar-title">Recurring vs One-off Spending</span>
                <span class="recurring-bar-hint">Add transactions to see breakdown</span>
            </div>
            <div class="recurring-bar-track">
                <div class="recurring-bar-fill recurring-bar-fill--recurring" style="width:0%"></div>
            </div>
            <div class="recurring-bar-legend">
                <span class="rbl-dot rbl-dot--recurring"></span>
                <span class="rbl-label">Recurring — ₹0.00 (0%)</span>
                <span class="rbl-spacer"></span>
                <span class="rbl-dot rbl-dot--oneoff"></span>
                <span class="rbl-label">One-off — ₹0.00 (0%)</span>
            </div>
        </div>
    `;
}

function _buildRecurringBar({ recurringSpend, oneOffSpend, recurringPct, recurringCount, oneOffCount, total }) {
    const oneOffPct = total > 0 ? (oneOffSpend / total) * 100 : 0;
    const recPctStr = recurringPct.toFixed(1);
    const oofPctStr = oneOffPct.toFixed(1);

    return `
        <div class="recurring-bar-wrap">
            <div class="recurring-bar-header">
                <span class="recurring-bar-title">Recurring vs One-off Spending</span>
                <span class="recurring-bar-hint">${recurringCount} recurring · ${oneOffCount} one-off</span>
            </div>
            <div class="recurring-bar-track" title="Recurring: ${recPctStr}% | One-off: ${oofPctStr}%">
                <div class="recurring-bar-fill recurring-bar-fill--recurring"
                     style="width:${recPctStr}%"
                     title="Recurring: ${formatCurrency(recurringSpend)} (${recPctStr}%)">
                </div>
                <div class="recurring-bar-fill recurring-bar-fill--oneoff"
                     style="width:${oofPctStr}%"
                     title="One-off: ${formatCurrency(oneOffSpend)} (${oofPctStr}%)">
                </div>
            </div>
            <div class="recurring-bar-legend">
                <span class="rbl-dot rbl-dot--recurring"></span>
                <span class="rbl-label">Recurring — ${formatCurrency(recurringSpend)} (${recPctStr}%)</span>
                <span class="rbl-spacer"></span>
                <span class="rbl-dot rbl-dot--oneoff"></span>
                <span class="rbl-label">One-off — ${formatCurrency(oneOffSpend)} (${oofPctStr}%)</span>
            </div>
        </div>
    `;
}

function _buildTableEmpty() {
    return `
        <div class="analytics-table-empty">
            <span class="analytics-table-empty-icon">📊</span>
            <p>No category data yet. Add transactions to see the breakdown.</p>
        </div>
    `;
}

function _buildCategoryTable(catTotals, grandTotal) {
    const entries = Object.entries(catTotals);

    if (entries.length === 0) {
        return _buildTableEmpty();
    }

    // Sort by total desc
    entries.sort((a, b) => b[1] - a[1]);

    const rows = entries.map(([cat, total], idx) => {
        const pct = grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(1) : '0.0';
        const barWidth = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
        const color = PALETTE[idx % PALETTE.length];
        return `
            <tr class="act-row">
                <td class="act-rank">${idx + 1}</td>
                <td class="act-name">
                    <span class="act-dot" style="background:${color}"></span>
                    ${_esc(cat)}
                </td>
                <td class="act-amount">${formatCurrency(total)}</td>
                <td class="act-pct-cell">
                    <div class="act-pct-bar-wrap">
                        <div class="act-pct-bar" style="width:${barWidth}%; background:${color}"></div>
                    </div>
                    <span class="act-pct-label">${pct}%</span>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="table-responsive">
            <table class="analytics-cat-table">
                <thead>
                    <tr>
                        <th class="act-rank">#</th>
                        <th>Category</th>
                        <th>Total Spend</th>
                        <th>Share of Budget</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

// Same palette as charts.js for visual consistency
const PALETTE = [
    '#6366f1','#10b981','#f59e0b','#06b6d4',
    '#f43f5e','#8b5cf6','#3b82f6','#ec4899',
    '#14b8a6','#84cc16','#eab308','#64748b',
];

function _esc(str) {
    return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
