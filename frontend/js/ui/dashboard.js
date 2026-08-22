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
 * It does NOT compute analytics, access LocalStorage, or call any service layer.
 */

import { formatCurrency, formatDate } from '../utils/formatters.js';

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
    }
    if (highestCategory !== undefined) {
        setText(ELEMENT_IDS.highestCategory, highestCategory);
    }
}

/**
 * Count transactions flagged as recurring and update the recurring-count card.
 * @param {Array<object>} transactions - Raw transaction array from the store.
 */
export function updateRecurringCount(transactions) {
    if (!Array.isArray(transactions)) return;
    const count = transactions.filter(t => Boolean(t.recurring)).length;
    setText(ELEMENT_IDS.recurringCount, count);
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

    // Sort newest → oldest, then take first 5
    const recent = [...analyzed]
        .sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db = b.date ? new Date(b.date).getTime() : 0;
            return db - da;
        })
        .slice(0, 5);

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
            <div class="recent-empty-icon">💳</div>
            <p class="recent-empty-title">No transactions yet</p>
            <p class="recent-empty-hint">Navigate to Transactions to add your first entry.</p>
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

    const typeBadge = tx.recurring
        ? '<span class="badge badge-recurring">Recurring</span>'
        : '<span class="badge badge-oneoff">One-off</span>';

    const anomalyBadge = isAnomaly
        ? '<span class="badge badge-anomaly">⚠ Anomaly</span>'
        : '';

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
                    <span class="recent-tx-meta">${tx.category || '--'} · ${displayDate}</span>
                    <div class="recent-tx-badges">
                        ${typeBadge}
                        ${anomalyBadge}
                    </div>
                </div>
            </div>
        </div>
    `;
}
