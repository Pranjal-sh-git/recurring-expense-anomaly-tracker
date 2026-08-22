/**
 * app.js — Central Application Orchestrator
 *
 * Responsibilities:
 *   - Boot the UI modules on DOMContentLoaded.
 *   - Load persisted transactions from the store.
 *   - Pipe data through anomaly detection and analytics.
 *   - Drive dashboard and table updates.
 *   - Handle form submission and delete actions.
 *
 * This file intentionally contains NO statistical calculations,
 * NO localStorage logic, and NO analytics formulas.
 * All of that is delegated to the appropriate service modules.
 */

import { getTransactions, addTransaction, deleteTransaction } from './state/transactionStore.js';
import { detectAnomalies, countAnomalies }                   from './services/anomalyService.js';
import { generateDashboardSummary }                          from './analytics/analyticsService.js';
import { initDashboard, updateDashboard }                    from './ui/dashboard.js';
import { initForm, getFormValues, resetForm,
         showFormError, showFormSuccess }                    from './ui/forms.js';
import { initTransactionTable, renderTransactions }          from './ui/transactionTable.js';
import { formatCurrency }                                    from './utils/formatters.js';

// ─── Core refresh cycle ───────────────────────────────────────────────────────

/**
 * Refresh the full UI with the latest store state.
 * Call this after every add / delete and once on initial load.
 */
function refreshApp() {
    const transactions = getTransactions();                         // raw from store
    const analyzed     = detectAnomalies(transactions);            // adds isAnomaly + zScore
    const summary      = generateDashboardSummary(transactions);   // totals / category
    const anomalyCount = countAnomalies(analyzed);                 // count from analyzed list

    updateDashboard({
        totalExpenses:     formatCurrency(summary.totalExpenses),
        totalTransactions: summary.totalTransactions,
        anomaliesDetected: anomalyCount,
        highestCategory:   summary.highestSpendingCategory ?? '--',
    });

    // Table receives anomaly-enriched objects so badges render correctly
    renderTransactions(analyzed);
}

// ─── Event handlers ───────────────────────────────────────────────────────────

/**
 * Handle form submission.
 * Validates values in the UI layer first, then delegates to the store.
 * @param {Event} e
 */
function handleFormSubmit(e) {
    e.preventDefault();

    const values = getFormValues();
    if (!values) return;

    // UI-level validation (fast feedback before hitting the store)
    if (!values.title) {
        showFormError('Please enter a title / merchant name.');
        return;
    }
    if (!values.amount || values.amount <= 0) {
        showFormError('Please enter a valid positive amount.');
        return;
    }
    if (!values.category) {
        showFormError('Please select a category.');
        return;
    }
    if (!values.date) {
        showFormError('Please select a date.');
        return;
    }

    try {
        // Store handles ID generation, deep validation, and persistence
        addTransaction({
            title:     values.title,
            amount:    values.amount,
            category:  values.category,
            date:      values.date,
            // `recurring` is captured here for future compatibility;
            // transactionStore.addTransaction() does not yet persist it.
            recurring: values.recurring,
        });

        refreshApp();
        resetForm();
        showFormSuccess('Transaction added successfully!');
    } catch (err) {
        // Store throws descriptive errors on validation failure
        showFormError(err.message || 'Failed to add transaction. Please try again.');
    }
}

/**
 * Handle row-level delete triggered from the transaction table.
 * @param {string} id — Transaction ID from the store.
 */
function handleDelete(id) {
    if (!id) return;
    const removed = deleteTransaction(id);
    if (removed) {
        refreshApp();
    }
}

// ─── Initialisation ───────────────────────────────────────────────────────────

/**
 * Bootstrap the application.
 * Called once when the DOM is ready.
 */
function init() {
    // 1. Initialise UI modules (render shells / placeholders)
    initDashboard();
    initForm();
    initTransactionTable(handleDelete);   // pass delete callback for event delegation

    // 2. Attach submit handler after initForm() has injected the form element
    const form = document.getElementById('expense-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // 3. Populate UI from persisted store data (handles empty LocalStorage gracefully)
    refreshApp();
}

document.addEventListener('DOMContentLoaded', init);
