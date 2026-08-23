/**
 * Dashboard UI Module
 * Manages DOM updates for the Overview dashboard.
 *
 * Exports:
 *   initDashboard()                    — Reset all cards to default placeholder state.
 *   updateDashboard(data)              — Update each metric card's DOM node.
 *   updateRecurringCount(transactions) — Count and display recurring transactions.
 *   updateRecentTransactions(analyzed) — Render the 5 most recent transactions.
 *
 * This module only touches the DOM.
 * It computes intermediate calculations for the new overview dashboard cards.
 */

import { formatCurrency, formatDate } from '../utils/formatters.js';
import { getTransactions } from '../state/transactionStore.js';
import { detectAnomalies } from '../services/anomalyService.js';

// ─── Element ID map ───────────────────────────────────────────────────────────

const ELEMENT_IDS = {
    totalExpenses:     'total-expenses-value',
    totalTransactions: 'total-transactions-value',
    anomaliesDetected: 'anomalies-value',
    highestCategory:   'highest-category-value',
    recurringCount:    'recurring-count-value',
    sidebarTotal:      'sidebar-record-count',
    sidebarAnomalies:  'sidebar-anomaly-count',
    recentList:        'recent-transactions-list',
};

// ─── Category emoji map ───────────────────────────────────────────────────────

/** Visual emoji for each spending category used in the recent-transactions list. */
const CATEGORY_EMOJI = {
    Subscriptions: '📺',
    Utilities:     '💡',
    Rent:          '🏠',
    Groceries:     '🛒',
    Dining:        '🍽️',
    Shopping:      '🛍️',
    Transport:     '🚗',
    Healthcare:    '💊',
    Other:         '📦',
};

// ─── Private helper ───────────────────────────────────────────────────────────

/**
 * Safely set the text content of an element by ID.
 * Logs a warning if the element is not found rather than throwing.
 * @param {string} id - Element ID.
 * @param {string|number} text - Value to set as textContent.
 */
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = text;
    } else {
        console.warn(`Dashboard: element #${id} not found in DOM.`);
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the dashboard by resetting all metric cards and the recent list
 * to their default placeholder values. Call once on page load.
 */
export function initDashboard() {
    console.log('Dashboard UI Module initialized.');

    setText(ELEMENT_IDS.totalExpenses,     '₹0.00');
    setText(ELEMENT_IDS.totalTransactions, '0');
    setText(ELEMENT_IDS.anomaliesDetected, '0');
    setText(ELEMENT_IDS.highestCategory,   '--');
    setText(ELEMENT_IDS.recurringCount,    '0');
    setText(ELEMENT_IDS.sidebarTotal,      '0');
    setText(ELEMENT_IDS.sidebarAnomalies,  '0');

    const listEl = document.getElementById(ELEMENT_IDS.recentList);
    if (listEl) {
        listEl.innerHTML = _buildRecentEmpty();
    }

    _updateOverviewRecurring([]);
    _updateOverviewSummary([]);
}

/**
 * Update the dashboard metric cards with the provided values.
 * Any omitted fields are left unchanged in the DOM.
 * Also syncs the sidebar live-count stats.
 *
 * @param {object}        data
 * @param {string|number} [data.totalExpenses]     - Formatted total (e.g. "₹1,200.00").
 * @param {string|number} [data.totalTransactions] - Total transaction count.
 * @param {string|number} [data.anomaliesDetected] - Number of anomalies detected.
 * @param {string}        [data.highestCategory]   - Name of the highest-spend category.
 */
export function updateDashboard({
    totalExpenses,
    totalTransactions,
    anomaliesDetected,
    highestCategory,
} = {}) {
    const transactions = getTransactions();

    if (totalExpenses     !== undefined) {
        setText(ELEMENT_IDS.totalExpenses, totalExpenses);
    }
    if (totalTransactions !== undefined) {
        setText(ELEMENT_IDS.totalTransactions, totalTransactions);
        setText(ELEMENT_IDS.sidebarTotal,      totalTransactions); // mirror to sidebar
    }
    if (anomaliesDetected !== undefined) {
        setText(ELEMENT_IDS.anomaliesDetected, anomaliesDetected);
        setText(ELEMENT_IDS.sidebarAnomalies,  anomaliesDetected); // mirror to sidebar

        const countNum = Number(anomaliesDetected) || 0;
        const anomValEl = document.getElementById(ELEMENT_IDS.anomaliesDetected);
        const anomCardEl = document.getElementById('anomalies-detected-card');

        if (anomValEl) {
            anomValEl.classList.toggle('metric-value--danger', countNum > 0);
        }
        if (anomCardEl) {
            anomCardEl.classList.toggle('metric-card--alert', countNum > 0);
        }
    }
    if (highestCategory !== undefined) {
        setText(ELEMENT_IDS.highestCategory, highestCategory);

        // Calculate category share dynamically
        const total = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        if (total > 0 && highestCategory !== '--') {
            const catTxs = transactions.filter(t => t.category === highestCategory);
            const catTotal = catTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            const pct = (catTotal / total) * 100;
            const parent = document.getElementById('highest-spending-card');
            if (parent) {
                const text = parent.querySelector('.comp-text');
                if (text) text.textContent = `${pct.toFixed(0)}% of total expenses`;
            }
        } else {
            const parent = document.getElementById('highest-spending-card');
            if (parent) {
                const text = parent.querySelector('.comp-text');
                if (text) text.textContent = `0% of total expenses`;
            }
        }
    }

    // Update secondary overview insight cards
    _updateOverviewRecurring(transactions);
    _updateOverviewSummary(transactions);
}

/**
 * Count transactions flagged as recurring and update the recurring-count card.
 * @param {Array<object>} transactions - Raw transaction array from the store.
 */
export function updateRecurringCount(transactions) {
    if (!Array.isArray(transactions)) return;
    const recurringTxs = transactions.filter(t => Boolean(t.recurring));
    const count = recurringTxs.length;
    const total = recurringTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    // Set the amount as value
    setText(ELEMENT_IDS.recurringCount, formatCurrency(total));
    
    // Set comparison sub text
    const parent = document.getElementById('recurring-count-card');
    if (parent) {
        const badge = parent.querySelector('.comp-badge');
        const text = parent.querySelector('.comp-text');
        if (badge) badge.textContent = `↑ ${count}`;
        if (text) text.textContent = `recurring entries`;
    }
}

/**
 * Render the 5 most recent transactions (by date, newest first) into the
 * recent-transactions panel on the Overview section.
 * @param {Array<object>} analyzed - Anomaly-enriched transaction array from detectAnomalies().
 */
export function updateRecentTransactions(analyzed) {
    const listEl = document.getElementById(ELEMENT_IDS.recentList);
    if (!listEl) return;

    if (!Array.isArray(analyzed) || analyzed.length === 0) {
        listEl.innerHTML = _buildRecentEmpty();
        return;
    }

    // Sort newest → oldest, then take first 6
    const recent = [...analyzed]
        .sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db = b.date ? new Date(b.date).getTime() : 0;
            return db - da;
        })
        .slice(0, 6);

    listEl.innerHTML = recent.map(_buildRecentItem).join('');
}

// ─── Private builders ─────────────────────────────────────────────────────────

/**
 * HTML template for the empty-state of the recent-transactions list.
 * @returns {string}
 */
function _buildRecentEmpty() {
    return `
        <div class="recent-empty">
            <div class="recent-empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                    <line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
            </div>
            <p class="recent-empty-title">No transactions recorded yet</p>
            <p class="recent-empty-hint">Add your first transaction to start seeing analytics, trends, and anomaly insights.</p>
        </div>
    `;
}

/**
 * HTML template for a single recent-transaction row.
 * @param {object} tx - Anomaly-enriched transaction object.
 * @returns {string}
 */
function _buildRecentItem(tx) {
    const emoji      = CATEGORY_EMOJI[tx.category] ?? '📦';
    const isAnomaly  = Boolean(tx.isAnomaly);
    const amtClass   = isAnomaly
        ? 'recent-tx-amount recent-tx-amount--anomaly'
        : 'recent-tx-amount';

    const displayAmt  = formatCurrency(tx.amount);
    const displayDate = formatDate(tx.date, 'medium') || tx.date || '--';

    const typeText = tx.recurring ? 'Recurring' : 'One-off';
    const anomalyText = isAnomaly ? ' · Anomaly' : '';
    const metaText = `${tx.category || '--'} · ${typeText}${anomalyText}`;

    const title = tx.title
        ? String(tx.title).replace(/</g, '&lt;').replace(/>/g, '&gt;')
        : 'Untitled';

    return `
        <div class="recent-tx-item">
            <div class="recent-tx-icon" aria-hidden="true">${emoji}</div>
            <div class="recent-tx-main">
                <div class="recent-tx-top">
                    <span class="recent-tx-title" title="${title}">${title}</span>
                    <span class="${amtClass}">${displayAmt}</span>
                </div>
                <div class="recent-tx-bottom">
                    <span class="recent-tx-meta">${metaText}</span>
                    <span class="recent-tx-date">${displayDate}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Updates the Recurring vs One-off card on the Overview dashboard.
 */
function _updateOverviewRecurring(transactions) {
    const el = document.getElementById('overview-recurring-card');
    if (!el) return;

    if (!Array.isArray(transactions) || transactions.length === 0) {
        el.innerHTML = `
            <div class="insight-card-header">
                <h3 class="insight-card-title">Recurring vs One-off</h3>
                <span class="insight-card-desc">Proportion of regular scheduled commitments</span>
            </div>
            <div class="segmented-bar-track">
                <div class="segmented-bar-fill segmented-bar-fill--recurring" style="width: 0%"></div>
                <div class="segmented-bar-fill segmented-bar-fill--oneoff" style="width: 0%"></div>
            </div>
            <div class="segmented-bar-legend">
                <div class="sbl-item">
                    <span class="sbl-percentage sbl-percentage--recurring">0%</span>
                    <span class="sbl-label">Recurring</span>
                    <span class="sbl-amount">₹0.00</span>
                </div>
                <div class="sbl-item sbl-item--right">
                    <span class="sbl-percentage sbl-percentage--oneoff">0%</span>
                    <span class="sbl-label">One-off</span>
                    <span class="sbl-amount">₹0.00</span>
                </div>
            </div>
        `;
        return;
    }

    const total = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const recurringTxs = transactions.filter(t => Boolean(t.recurring));
    const recurringSpend = recurringTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const oneOffSpend = Math.max(0, total - recurringSpend);

    const recPct = total > 0 ? (recurringSpend / total) * 100 : 0;
    const oneOffPct = total > 0 ? (oneOffSpend / total) * 100 : 0;

    el.innerHTML = `
        <div class="insight-card-header">
            <h3 class="insight-card-title">Recurring vs One-off</h3>
            <span class="insight-card-desc">Proportion of regular scheduled commitments</span>
        </div>
        <div class="segmented-bar-track">
            <div class="segmented-bar-fill segmented-bar-fill--recurring" style="width: ${recPct}%"></div>
            <div class="segmented-bar-fill segmented-bar-fill--oneoff" style="width: ${oneOffPct}%"></div>
        </div>
        <div class="segmented-bar-legend">
            <div class="sbl-item">
                <span class="sbl-percentage sbl-percentage--recurring">${recPct.toFixed(0)}%</span>
                <span class="sbl-label">Recurring</span>
                <span class="sbl-amount">${formatCurrency(recurringSpend)}</span>
            </div>
            <div class="sbl-item sbl-item--right">
                <span class="sbl-percentage sbl-percentage--oneoff">${oneOffPct.toFixed(0)}%</span>
                <span class="sbl-label">One-off</span>
                <span class="sbl-amount">${formatCurrency(oneOffSpend)}</span>
            </div>
        </div>
    `;
}

/**
 * Updates the Monthly Summary card on the Overview dashboard.
 */
function _updateOverviewSummary(transactions) {
    const el = document.getElementById('overview-summary-card');
    if (!el) return;

    if (!Array.isArray(transactions) || transactions.length === 0) {
        el.innerHTML = `
            <div class="insight-card-header">
                <h3 class="insight-card-title">Monthly Summary</h3>
                <span class="insight-card-desc">Key spending statistics this month</span>
            </div>
            <div class="summary-list">
                <div class="summary-row">
                    <span class="summary-row-label">Highest Expense</span>
                    <span class="summary-row-value">--</span>
                </div>
                <div class="summary-row">
                    <span class="summary-row-label">Average Transaction</span>
                    <span class="summary-row-value">₹0.00</span>
                </div>
                <div class="summary-row">
                    <span class="summary-row-label">Total Categories</span>
                    <span class="summary-row-value">0</span>
                </div>
                <div class="summary-row">
                    <span class="summary-row-label">Anomaly Rate</span>
                    <span class="summary-row-badge" style="background:#f1f4f6;color:var(--text-secondary);">0.0%</span>
                </div>
            </div>
        `;
        return;
    }

    const total = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const count = transactions.length;
    const avgAmount = count > 0 ? total / count : 0;

    const highestTx = [...transactions].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))[0];
    const highestExpenseCategory = highestTx ? highestTx.category : '--';
    const highestExpenseAmt = highestTx ? formatCurrency(highestTx.amount) : '₹0.00';

    const categories = new Set(transactions.map(t => t.category).filter(Boolean));
    const totalCategoriesCount = categories.size;

    // Detect anomalies
    const analyzed = detectAnomalies(transactions);
    const anomalyCount = analyzed.filter(t => Boolean(t.isAnomaly)).length;
    const anomalyRate = count > 0 ? (anomalyCount / count) * 100 : 0;
    const anomalyRateStr = `${anomalyRate.toFixed(1)}%`;

    el.innerHTML = `
        <div class="insight-card-header">
            <h3 class="insight-card-title">Monthly Summary</h3>
            <span class="insight-card-desc">Key spending statistics this month</span>
        </div>
        <div class="summary-list">
            <div class="summary-row">
                <span class="summary-row-label">Highest Expense</span>
                <div class="summary-row-value-group">
                    <span class="summary-row-value-sub">${highestExpenseCategory}</span>
                    <span class="summary-row-value">${highestExpenseAmt}</span>
                </div>
            </div>
            <div class="summary-row">
                <span class="summary-row-label">Average Transaction</span>
                <span class="summary-row-value">${formatCurrency(avgAmount)}</span>
            </div>
            <div class="summary-row">
                <span class="summary-row-label">Total Categories</span>
                <span class="summary-row-value">${totalCategoriesCount}</span>
            </div>
            <div class="summary-row">
                <span class="summary-row-label">Anomaly Rate</span>
                <span class="summary-row-badge" style="background:${anomalyCount > 0 ? '#fdf2f1' : '#eef9ec'};color:${anomalyCount > 0 ? 'var(--danger)' : '#2b7a15'};">
                    ${anomalyRateStr}
                </span>
            </div>
        </div>
    `;
}

