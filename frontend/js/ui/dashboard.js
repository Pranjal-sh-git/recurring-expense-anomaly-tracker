/**
 * Dashboard UI Module
 * Manages DOM updates for the four summary cards on the Dashboard Summary section.
 *
 * Exports:
 *   initDashboard()      - Resets all summary cards to their default placeholder state.
 *   updateDashboard(data) - Accepts a plain data object and updates each card's DOM node.
 *
 * This module only touches the DOM.
 * It does NOT compute analytics, access LocalStorage, or call any service layer.
 */

// ─── Element ID map ───────────────────────────────────────────────────────────

const ELEMENT_IDS = {
    totalExpenses:      'total-expenses-value',
    totalTransactions:  'total-transactions-value',
    anomaliesDetected:  'anomalies-value',
    highestCategory:    'highest-category-value',
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
 * Initialise the dashboard by resetting all four summary cards to their
 * default placeholder values. Call once on page load.
 */
export function initDashboard() {
    console.log('Dashboard UI Module initialized.');
    setText(ELEMENT_IDS.totalExpenses,     '$0.00');
    setText(ELEMENT_IDS.totalTransactions, '0');
    setText(ELEMENT_IDS.anomaliesDetected, '0');
    setText(ELEMENT_IDS.highestCategory,   '--');
}

/**
 * Update the four dashboard summary cards with the provided values.
 * Any omitted fields are left unchanged in the DOM.
 *
 * @param {object} data
 * @param {string|number} [data.totalExpenses]     - Formatted total expense string (e.g. "$1,200.00") or raw number.
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
    if (totalExpenses     !== undefined) setText(ELEMENT_IDS.totalExpenses,     totalExpenses);
    if (totalTransactions !== undefined) setText(ELEMENT_IDS.totalTransactions, totalTransactions);
    if (anomaliesDetected !== undefined) setText(ELEMENT_IDS.anomaliesDetected, anomaliesDetected);
    if (highestCategory   !== undefined) setText(ELEMENT_IDS.highestCategory,   highestCategory);
}
