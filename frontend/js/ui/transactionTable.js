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

// ─── Module-level callbacks (set by initTransactionTable) ─────────────────────
let _onDeleteCallback = null;
let _onEditCallback   = null;

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
                        <th class="tx-actions-header">Action</th>
                    </tr>
                </thead>
                <tbody id="transaction-table-body">
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Escape HTML characters in strings to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function _esc(str) {
    return String(str ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Build a single table row for a transaction.
 * @param {object} tx - A transaction object (may include isAnomaly and zScore from anomalyService).
 * @returns {string} HTML string for a <tr> element.
 */
function buildRow(tx) {
    const displayDate = formatDate(tx.date, 'medium');
    const displayAmt = formatCurrency(tx.amount);
    const isAnomaly = Boolean(tx.isAnomaly);
    const rowClass = isAnomaly ? 'tx-row row-anomaly' : 'tx-row';
    const safeTitle = _esc(tx.title || '--');
    const safeCategory = _esc(tx.category || 'Other');

    // Type badge
    const typeBadge = tx.recurring
        ? '<span class="badge badge-recurring"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11" aria-hidden="true"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg> Recurring</span>'
        : '<span class="badge badge-oneoff">One-off</span>';

    // Anomaly status badge (only badge in STATUS column)
    const statusBadge = isAnomaly
        ? '<span class="badge badge-anomaly">⚠ Anomaly</span>'
        : '<span class="badge badge-normal">Normal</span>';

    // Category badge styling
    const categoryBadge = `<span class="badge badge-category">${safeCategory}</span>`;

    // Safely encode the id for the data attribute
    const safeId = _esc(tx.id);

    return `
        <tr class="${rowClass}" data-id="${safeId}">
            <td class="tx-date">${displayDate || _esc(tx.date) || '--'}</td>
            <td class="tx-title" title="${safeTitle}">${safeTitle}</td>
            <td class="tx-category-cell">${categoryBadge}</td>
            <td class="tx-amount">${displayAmt}</td>
            <td>${typeBadge}</td>
            <td class="tx-status-cell">${statusBadge}</td>
            <td class="tx-actions">
                <div class="tx-actions-btns">
                    <button
                        type="button"
                        class="btn-edit"
                        data-id="${safeId}"
                        title="Edit transaction"
                        aria-label="Edit transaction"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button
                        type="button"
                        class="btn-delete"
                        data-id="${safeId}"
                        title="Delete transaction"
                        aria-label="Delete transaction"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Build the empty-state row shown when the transaction list is empty or filters return no matches.
 * @returns {string} HTML string for a single <tr> empty-state row.
 */
function buildEmptyRow() {
    return `
        <tr class="empty-state-row">
            <td colspan="7" class="empty-state-cell">
                <div class="empty-state">
                    <span class="empty-state-icon" aria-hidden="true">💸</span>
                    <p class="empty-state-text">No transactions match your criteria.</p>
                    <p class="empty-state-hint">Add a new transaction or reset your filter settings.</p>
                </div>
            </td>
        </tr>
    `;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the transaction table by injecting the table shell with an empty state.
 * Sets up event delegation for edit and delete buttons.
 * Call this once on page load.
 *
 * @param {Function} [onDelete] - Optional callback invoked with the transaction ID when a delete button is clicked.
 * @param {Function} [onEdit]   - Optional callback invoked with the transaction ID when an edit button is clicked.
 */
export function initTransactionTable(onDelete, onEdit) {
    console.log('Transaction Table UI Module initialized.');

    // Store callbacks for use in the delegated event handler
    _onDeleteCallback = typeof onDelete === 'function' ? onDelete : null;
    _onEditCallback   = typeof onEdit === 'function' ? onEdit : null;

    const container = document.getElementById('transaction-table-container');
    if (!container) return;

    container.innerHTML = buildTableShell();

    // Event delegation: handle edit and delete button clicks anywhere in the container
    container.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit');
        if (editBtn && _onEditCallback) {
            const id = editBtn.dataset.id;
            if (id) {
                _onEditCallback(id);
            }
            return;
        }

        const delBtn = e.target.closest('.btn-delete');
        if (delBtn && _onDeleteCallback) {
            const id = delBtn.dataset.id;
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
 * @param {object} [options={}] - Rendering options { isOffline: boolean }.
 */
export function renderTransactions(transactions, options = {}) {
    const tbody = document.getElementById('transaction-table-body');
    if (!tbody) {
        console.warn('renderTransactions: #transaction-table-body not found. Call initTransactionTable() first.');
        return;
    }

    const isOffline = Boolean(options.isOffline);
    const container = document.getElementById('transaction-table-container');

    // Manage the in-memory offline banner above table
    let offlineBanner = document.getElementById('table-offline-banner');
    if (isOffline && Array.isArray(transactions) && transactions.length > 0) {
        if (!offlineBanner && container) {
            offlineBanner = document.createElement('div');
            offlineBanner.id = 'table-offline-banner';
            offlineBanner.className = 'table-offline-banner';
            container.insertBefore(offlineBanner, container.firstChild);
        }
        if (offlineBanner) {
            offlineBanner.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div class="tob-text">
                    <strong>Backend Connection Lost (In-Memory View)</strong>
                    <span>Showing ${transactions.length} previously loaded records from memory. These records are not verified with MongoDB. Reconnect the server to resume live synchronization.</span>
                </div>
            `;
            offlineBanner.style.display = 'flex';
        }
    } else if (offlineBanner) {
        offlineBanner.style.display = 'none';
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
        tbody.innerHTML = buildEmptyRow();
        return;
    }

    tbody.innerHTML = transactions.map(buildRow).join('');
}

/**
 * Render an explicit error state in the transaction table body.
 * Displayed when the backend MongoDB API is unreachable or returns an error.
 * @param {string} [errorMessage]
 */
export function renderTableError(errorMessage) {
    const tbody = document.getElementById('transaction-table-body');
    const offlineBanner = document.getElementById('table-offline-banner');
    if (offlineBanner) offlineBanner.style.display = 'none';
    if (!tbody) return;

    tbody.innerHTML = `
        <tr class="empty-state-row">
            <td colspan="7" class="empty-state-cell">
                <div class="empty-state empty-state--error">
                    <span class="empty-state-icon" aria-hidden="true">⚠️</span>
                    <p class="empty-state-text" style="font-weight:600; color: #ef4444;">Unable to sync with server</p>
                    <p class="empty-state-hint">${_esc(errorMessage || 'Database connection error. Please ensure the backend server is running and reload to retry.')}</p>
                </div>
            </td>
        </tr>
    `;
}
