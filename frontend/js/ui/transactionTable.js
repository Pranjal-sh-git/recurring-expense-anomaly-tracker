/**
 * Transaction Table UI Module
 * Renders a dynamic list of transactions into #transaction-table-container.
 *
 * Exports:
 *   initTransactionTable(onDelete)    - Sets up the table shell with an empty state.
 *                                       Accepts an optional delete callback for row actions.
 *   renderTransactions(transactions)  - Accepts an array of transaction objects
 *                                       (optionally anomaly-enriched with isAnomaly/zScore)
 *                                       and re-renders the table body.
 *
 * Transaction object shape expected by renderTransactions():
 *   {
 *     id:        string | number,  // unique identifier
 *     title:     string,           // merchant / description
 *     amount:    number,           // numeric amount
 *     category:  string,
 *     date:      string,           // YYYY-MM-DD
 *     recurring: boolean,          // optional, defaults to false
 *     isAnomaly: boolean,          // optional, added by anomalyService
 *     zScore:    number,           // optional, added by anomalyService
 *   }
 *
 * This module does NOT access LocalStorage or perform any business logic.
 */

import { formatCurrency, formatDate } from '../utils/formatters.js';

// ─── Module-level delete callback (set by initTransactionTable) ───────────────
let _onDeleteCallback = null;

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Build the static table skeleton (header row + empty tbody).
 * @returns {string} HTML string for the full table wrapper.
 */
function buildTableShell() {
    return `
        <div class="table-responsive">
            <table class="transaction-table" id="transaction-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Title / Merchant</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="transaction-table-body">
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Build a single table row for a transaction.
 * @param {object} tx - A transaction object (may include isAnomaly and zScore from anomalyService).
 * @returns {string} HTML string for a <tr> element.
 */
function buildRow(tx) {
    const displayDate = formatDate(tx.date, 'medium');
    const displayAmt  = formatCurrency(tx.amount);
    const isAnomaly   = Boolean(tx.isAnomaly);
    const rowClass    = isAnomaly ? 'tx-row row-anomaly' : 'tx-row';

    // Type badge — note: recurring field may not be persisted by the store yet
    const typeBadge = tx.recurring
        ? '<span class="badge badge-recurring">Recurring</span>'
        : '<span class="badge badge-oneoff">One-off</span>';

    // Anomaly status badge
    const statusBadge = isAnomaly
        ? '<span class="badge badge-anomaly">&#9888; Anomaly</span>'
        : '<span class="badge badge-normal">Normal</span>';

    // Safely encode the id for the data attribute
    const safeId = String(tx.id ?? '').replace(/"/g, '&quot;');

    return `
        <tr class="${rowClass}" data-id="${safeId}">
            <td>${displayDate || tx.date || '--'}</td>
            <td class="tx-title">${tx.title || '--'}</td>
            <td>${tx.category || '--'}</td>
            <td class="tx-amount">${displayAmt}</td>
            <td>${typeBadge}</td>
            <td>${statusBadge}</td>
            <td>
                <button
                    class="btn-delete"
                    data-id="${safeId}"
                    title="Delete transaction"
                    aria-label="Delete transaction"
                >&#10005;</button>
            </td>
        </tr>
    `;
}

/**
 * Build the empty-state row shown when the transaction list is empty.
 * @returns {string} HTML string for a single <tr> empty-state row.
 */
function buildEmptyRow() {
    return `
        <tr class="empty-state-row">
            <td colspan="7" class="empty-state-cell">
                <div class="empty-state">
                    <span class="empty-state-icon">&#128184;</span>
                    <p class="empty-state-text">No transactions yet.</p>
                    <p class="empty-state-hint">Add your first transaction using the form.</p>
                </div>
            </td>
        </tr>
    `;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the transaction table by injecting the table shell with an empty state.
 * Sets up event delegation for delete buttons.
 * Call this once on page load.
 *
 * @param {Function} [onDelete] - Optional callback invoked with the transaction ID when a delete button is clicked.
 */
export function initTransactionTable(onDelete) {
    console.log('Transaction Table UI Module initialized.');

    // Store the delete callback for use in the delegated event handler
    _onDeleteCallback = typeof onDelete === 'function' ? onDelete : null;

    const container = document.getElementById('transaction-table-container');
    if (!container) return;

    container.innerHTML = buildTableShell();

    // Event delegation: handle delete button clicks anywhere in the container
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-delete');
        if (btn && _onDeleteCallback) {
            const id = btn.dataset.id;
            if (id) {
                _onDeleteCallback(id);
            }
        }
    });

    // Start with the empty state
    const tbody = document.getElementById('transaction-table-body');
    if (tbody) {
        tbody.innerHTML = buildEmptyRow();
    }
}

/**
 * Re-render the transaction table body with the supplied array of transactions.
 * Replaces all existing rows; shows the empty-state message for an empty array.
 *
 * @param {Array<object>} transactions - Array of transaction objects.
 */
export function renderTransactions(transactions) {
    const tbody = document.getElementById('transaction-table-body');
    if (!tbody) {
        console.warn('renderTransactions: #transaction-table-body not found. Call initTransactionTable() first.');
        return;
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
        tbody.innerHTML = buildEmptyRow();
        return;
    }

    tbody.innerHTML = transactions.map(buildRow).join('');
}
