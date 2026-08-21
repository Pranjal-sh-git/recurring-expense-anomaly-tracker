/**
 * Transaction Table UI Module
 * Renders a dynamic list of transactions into #transaction-table-container.
 *
 * Exports:
 *   initTransactionTable()           - Sets up the table shell with an empty state.
 *   renderTransactions(transactions) - Accepts an array of transaction objects
 *                                      and re-renders the table body.
 *
 * Transaction object shape expected by renderTransactions():
 *   {
 *     id:        string | number,  // unique identifier
 *     title:     string,           // merchant / description
 *     amount:    number,           // numeric amount
 *     category:  string,
 *     date:      string,           // YYYY-MM-DD
 *     recurring: boolean,          // optional, defaults to false
 *   }
 *
 * This module does NOT access LocalStorage or perform any business logic.
 */

import { formatCurrency, formatDate } from '../utils/formatters.js';

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
 * @param {object} tx - A transaction object.
 * @returns {string} HTML string for a <tr> element.
 */
function buildRow(tx) {
    const type        = tx.recurring ? 'Recurring' : 'One-off';
    const displayDate = formatDate(tx.date, 'medium');
    const displayAmt  = formatCurrency(tx.amount);

    return `
        <tr data-id="${tx.id ?? ''}">
            <td>${displayDate || tx.date || '--'}</td>
            <td>${tx.title || '--'}</td>
            <td>${tx.category || '--'}</td>
            <td>${displayAmt}</td>
            <td>${type}</td>
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
            <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted); font-style: italic;">
                No transactions yet. Add your first transaction above.
            </td>
        </tr>
    `;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the transaction table by injecting the table shell with an empty state.
 * Call this once on page load.
 */
export function initTransactionTable() {
    console.log('Transaction Table UI Module initialized.');

    const container = document.getElementById('transaction-table-container');
    if (!container) return;

    container.innerHTML = buildTableShell();

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
