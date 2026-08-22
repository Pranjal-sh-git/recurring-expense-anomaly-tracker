/**
 * app.js — Central Application Orchestrator
 *
 * Responsibilities:
 *   - Boot the UI modules on DOMContentLoaded.
 *   - Load persisted transactions from the store.
 *   - Pipe data through anomaly detection and analytics.
 *   - Drive dashboard, sidebar, recent-list, and table updates.
 *   - Handle form submission and delete actions.
 *
 * This file intentionally contains NO statistical calculations,
 * NO localStorage logic, and NO analytics formulas.
 * All of that is delegated to the appropriate service modules.
 */

import { getTransactions, addTransaction, deleteTransaction }  from './state/transactionStore.js';
import { detectAnomalies, countAnomalies }                     from './services/anomalyService.js';
import { generateDashboardSummary }                            from './analytics/analyticsService.js';
import { updateAllCharts }                                     from './analytics/charts.js';
import { initDashboard, updateDashboard,
         updateRecurringCount, updateRecentTransactions }      from './ui/dashboard.js';
import { initForm, getFormValues, resetForm,
         showFormError, showFormSuccess }                      from './ui/forms.js';
import { initTransactionTable, renderTransactions }            from './ui/transactionTable.js';
import { formatCurrency }                                      from './utils/formatters.js';
import { initNavigation }                                      from './ui/navigation.js';
import { initAnalyticsView, updateAnalyticsView }             from './ui/analyticsView.js';
import { initAnomalyView,   updateAnomalyView   }             from './ui/anomalyView.js';
import { initFilters, applyFilters }                           from './ui/transactionFilters.js';

// ─── Core refresh cycle ───────────────────────────────────────────────────────

/**
 * Re-render the transaction table with current filter settings.
 */
function renderFilteredTable() {
    const transactions = getTransactions();
    const analyzed     = detectAnomalies(transactions);
    const filtered     = applyFilters(analyzed);
    renderTransactions(filtered);
}

/**
 * Refresh the full UI with the latest store state.
 * Called after every add / delete and once on initial load.
 */
function refreshApp() {
    const transactions = getTransactions();                        // raw from store
    const analyzed     = detectAnomalies(transactions);           // adds isAnomaly + zScore
    const summary      = generateDashboardSummary(transactions);  // totals / category
    const anomalyCount = countAnomalies(analyzed);                // integer count

    // ── Overview metric cards ──
    updateDashboard({
        totalExpenses:     formatCurrency(summary.totalExpenses),
        totalTransactions: summary.totalTransactions,
        anomaliesDetected: anomalyCount,
        highestCategory:   summary.highestSpendingCategory ?? '--',
    });

    // ── Recurring count card + sidebar anomaly mirror ──
    updateRecurringCount(transactions);

    // ── Recent transactions feed (Overview section) ──
    updateRecentTransactions(analyzed);

    // ── Analytics section ──
    updateAnalyticsView(transactions, analyzed);

    // ── Anomaly Insights section ──
    updateAnomalyView(transactions, analyzed);

    // ── Full transaction table (Transactions section) ──
    // Table receives filtered + anomaly-enriched objects so badges render correctly.
    renderFilteredTable();

    // ── Charts (Overview section containers) ──
    updateAllCharts(transactions);
}

// ─── Event handlers ───────────────────────────────────────────────────────────

/**
 * Handle form submission.
 * Performs UI-level validation first, then delegates to the store.
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
        // Store handles ID generation, normalization, deep validation, and persistence
        addTransaction({
            title:     values.title,
            amount:    values.amount,
            category:  values.category,
            date:      values.date,
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
    // 1. Navigation — must come first so section switching is active before any
    //    other module renders content (e.g. charts inside the overview section).
    initNavigation(refreshApp);

    // 2. Initialise UI modules (render shells / placeholders)
    initDashboard();
    initAnalyticsView();
    initAnomalyView();
    initForm();
    initFilters(renderFilteredTable);
    initTransactionTable(handleDelete);  // pass delete callback for event delegation

    // 3. Attach submit handler after initForm() has injected the form element
    const form = document.getElementById('expense-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // 4. Populate UI from persisted store data (handles empty LocalStorage gracefully)
    refreshApp();
}

document.addEventListener('DOMContentLoaded', init);
