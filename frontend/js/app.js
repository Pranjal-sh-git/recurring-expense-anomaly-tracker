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

import { getTransactions, getTransactionById, addTransaction, updateTransaction, deleteTransaction, reloadForUser, clearInMemoryState } from './state/transactionStore.js';
import { detectAnomalies, countAnomalies }                     from './services/anomalyService.js';
import { generateDashboardSummary }                            from './analytics/analyticsService.js';
import { updateAllCharts, renderAllChartsUnavailable }         from './analytics/charts.js';
import { initDashboard, updateDashboard,
         updateRecurringCount, updateRecentTransactions,
         setServerConnectionStatus, renderDashboardUnavailable } from './ui/dashboard.js';
import { initForm, getFormValues, resetForm,
         showFormError, showFormSuccess }                      from './ui/forms.js';
import { initTransactionTable, renderTransactions, renderTableError } from './ui/transactionTable.js';
import { formatCurrency }                                      from './utils/formatters.js';
import { initNavigation }                                      from './ui/navigation.js';
import { initAnalyticsView, updateAnalyticsView, renderAnalyticsUnavailable } from './ui/analyticsView.js';
import { initAnomalyView,   updateAnomalyView,   renderAnomalyUnavailable   } from './ui/anomalyView.js';
import { initFilters, applyFilters }                           from './ui/transactionFilters.js';
import { initDateRangePicker, filterTransactionsByDate }      from './ui/dateRangePicker.js';
import { initLandingPage }                                     from './landing.js';
import { initAuthModal }                                       from './ui/authModal.js';
import { isAuthenticated, updateNavbarUserDisplay }             from './services/authService.js';
import { showDashboard }                                       from './ui/navigation.js';
import { initCSVImport }                                       from './ui/csvImport.js';
import { initEditModal, openEditModal, closeEditModal,
         showEditModalError, showEditModalToast }              from './ui/editTransactionModal.js';

import { fetchAllDashboardAnalytics }                           from './services/analyticsApiClient.js';
import { getActiveDateRange }                                      from './ui/dateRangePicker.js';

// ─── Core refresh cycle ───────────────────────────────────────────────────────

/**
 * Re-render the transaction table with current filter settings and active date range.
 * @param {Array<object>} [enrichedTransactions] - Optional transactions enriched with backend anomalies.
 * @param {object} [options={}] - Options { isOffline: boolean }.
 */
function renderFilteredTable(enrichedTransactions = null, options = {}) {
    const raw = enrichedTransactions || getTransactions();
    const transactions = enrichedTransactions ? raw : filterTransactionsByDate(raw);
    const analyzed = enrichedTransactions ? transactions : detectAnomalies(transactions);
    const filtered = applyFilters(analyzed);
    renderTransactions(filtered, options);
}

/**
 * Fallback local rendering for unauthenticated/guest sessions or offline operation.
 * @param {Array<object>} transactions
 */
function _renderFallbackApp(transactions) {
    const analyzed     = detectAnomalies(transactions);
    const summary      = generateDashboardSummary(transactions);
    const anomalyCount = countAnomalies(analyzed);

    updateDashboard({
        totalExpenses:     formatCurrency(summary.totalExpenses),
        totalTransactions: summary.totalTransactions,
        anomaliesDetected: anomalyCount,
        highestCategory:   summary.highestSpendingCategory ?? '--',
    }, transactions);

    updateRecurringCount(transactions);
    updateRecentTransactions(analyzed);
    updateAnalyticsView(transactions, analyzed);
    updateAnomalyView(transactions, analyzed);
    renderFilteredTable(analyzed);
    updateAllCharts(transactions);
}

/**
 * Toggle visual loading state during backend asynchronous analytics fetch.
 * @param {boolean} isLoading
 * @param {string|null} [errorMsg]
 */
function _setAnalyticsLoadingState(isLoading, errorMsg = null) {
    const metricsGrid = document.querySelector('.metrics-grid');
    if (metricsGrid) {
        metricsGrid.classList.toggle('metrics-grid--loading', isLoading);
    }
    if (errorMsg) {
        console.warn('[KharchaSense Analytics API Warning]:', errorMsg);
    }
}

/**
 * Refresh the full UI with authoritative data from the backend.
 * Fetches analytics summary, categories, trends, recurring, and anomalies from Express APIs.
 * Called after every add / edit / delete, CSV import, date range change, and on initial boot.
 */
async function refreshApp() {
    const raw = getTransactions();
    const dateRange = typeof getActiveDateRange === 'function' ? getActiveDateRange() : null;
    const transactions = filterTransactionsByDate(raw);

    if (isAuthenticated()) {
        try {
            _setAnalyticsLoadingState(true);
            const backendData = await fetchAllDashboardAnalytics(dateRange);

            // Guard against race conditions: if this response was superseded by a newer request, drop it
            if (backendData && backendData.isCurrent === false) {
                return;
            }

            if (backendData) {
                // Confirm server connection is healthy and restore active sync status
                setServerConnectionStatus(true, 'Synced just now');

                const { summary, categories, trends, recurring, anomalies, anomalySummary } = backendData;

                // 1. Map backend-flagged anomalies onto transactions
                const backendAnomalyList = anomalies?.anomalies || [];
                const anomalyMap = new Map();
                backendAnomalyList.forEach(a => {
                    const idStr = String(a.id || a._id || '');
                    if (idStr) anomalyMap.set(idStr, a);
                });

                const analyzed = transactions.map(t => {
                    const txId = String(t.id || t._id || '');
                    const matched = txId ? anomalyMap.get(txId) : null;
                    if (matched) {
                        return {
                            ...t,
                            isAnomaly: true,
                            zScore: matched.zScore,
                            anomalyReason: matched.anomalyReason,
                            categoryMean: matched.categoryMean
                        };
                    }
                    return {
                        ...t,
                        isAnomaly: false,
                        zScore: 0
                    };
                });

                const anomalyCount = anomalySummary?.anomalyCount ?? backendAnomalyList.length;

                // 2. Overview metric cards (using backend-calculated summary)
                updateDashboard({
                    totalExpenses:     formatCurrency(summary?.totalExpenses ?? summary?.totalSpending ?? 0),
                    totalTransactions: summary?.totalTransactions ?? summary?.transactionCount ?? 0,
                    anomaliesDetected: anomalyCount,
                    highestCategory:   summary?.highestSpendingCategory ?? '--',
                }, transactions, backendData);

                // 3. Recurring count (using backend-calculated recurring analytics)
                if (recurring) {
                    updateRecurringCount(transactions, recurring);
                } else {
                    updateRecurringCount(transactions);
                }

                // 4. Recent transactions feed
                updateRecentTransactions(analyzed);

                // 5. Analytics section (passing backend summary, categories, trends, recurring)
                updateAnalyticsView(transactions, analyzed, { summary, categories, trends, recurring });

                // 6. Anomaly Insights section (passing backend anomalies and statistical anomalySummary)
                updateAnomalyView(transactions, analyzed, { anomalies, anomalySummary });

                // 7. Full transaction table with backend anomaly flags and live sync badge
                renderFilteredTable(analyzed, { isOffline: false });

                // 8. Charts (passing backend pre-computed category & daily trend distributions)
                updateAllCharts(transactions, {
                    categoriesData: categories,
                    trendsData: trends
                });

                _setAnalyticsLoadingState(false);
                return;
            }
        } catch (apiError) {
            _setAnalyticsLoadingState(false, apiError.message);
            const hasInMemory = transactions.length > 0;
            setServerConnectionStatus(false, hasInMemory ? 'Connection lost (In-memory)' : 'Unable to sync with server', hasInMemory);

            if (hasInMemory) {
                // Distinguish previously loaded in-memory transactions from freshly synced MongoDB records
                renderFilteredTable(null, { isOffline: true });
                renderAllChartsUnavailable('Server connection lost. Charts cannot be generated from live MongoDB data.');
                renderAnalyticsUnavailable(apiError.message || 'Server connection lost.');
                renderAnomalyUnavailable(apiError.message || 'Server connection lost.');
            } else {
                // Complete unavailable state on reload/initial fetch failure
                renderTableError(apiError.message || 'Unable to connect to KharchaSense backend server.');
                renderDashboardUnavailable(apiError.message || 'Server connection lost.');
                renderAllChartsUnavailable('Unable to connect to backend server. Verify server is running on port 5000.');
                renderAnalyticsUnavailable(apiError.message || 'Backend connection failed.');
                renderAnomalyUnavailable(apiError.message || 'Backend connection failed.');
            }
            return;
        }
    }

    // Fallback for unauthenticated guest sessions
    _renderFallbackApp(transactions);
}

// ─── Event handlers ───────────────────────────────────────────────────────────

/**
 * Handle form submission.
 * Performs UI-level validation first, then delegates to the MongoDB-backed store.
 * @param {Event} e
 */
async function handleFormSubmit(e) {
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
        // Store handles normalization, backend persistence, and cache
        await addTransaction({
            title:     values.title,
            amount:    values.amount,
            category:  values.category,
            date:      values.date,
            recurring: values.recurring,
        });

        await refreshApp();
        resetForm();
        showFormSuccess('Transaction added successfully!');
    } catch (err) {
        // Requirement 1: Failed API writes never appear as saved transactions
        // Requirement 5: Form values are preserved because resetForm() is NOT called
        const isConnError = err.message && (
            err.message.includes('Unable to connect') ||
            err.message.includes('Failed to fetch') ||
            err.message.includes('NetworkError') ||
            err.message.includes('ECONNREFUSED')
        );
        if (isConnError) {
            setServerConnectionStatus(false, 'Connection lost', getTransactions().length > 0);
            showFormError('Connection lost: Server is offline. Your inputs are preserved — please retry once server is back online.');
        } else {
            showFormError(err.message || 'Failed to add transaction. Please try again.');
        }
    }
}

/**
 * Handle row-level edit triggered from the transaction table.
 * Opens the Edit Transaction Modal with existing transaction fields pre-filled.
 * @param {string} id — Transaction ID from the store.
 */
function handleEdit(id) {
    if (!id) return;
    const tx = getTransactionById(id);
    if (!tx) {
        showEditModalToast('Transaction could not be found.', 'error');
        return;
    }
    openEditModal(tx);
}

/**
 * Handle save changes from the Edit Transaction Modal.
 * Updates the backend store, synchronizes views, shows toast, and closes the modal.
 * @param {Object} updatedValues
 */
async function handleUpdateSave(updatedValues) {
    if (!updatedValues || !updatedValues.id) return;

    try {
        await updateTransaction(updatedValues.id, {
            title:     updatedValues.title,
            amount:    updatedValues.amount,
            category:  updatedValues.category,
            date:      updatedValues.date,
            recurring: updatedValues.recurring,
        });

        await refreshApp();
        closeEditModal();
        showEditModalToast('Transaction updated successfully!', 'success');
    } catch (err) {
        const isConnError = err.message && (
            err.message.includes('Unable to connect') ||
            err.message.includes('Failed to fetch') ||
            err.message.includes('NetworkError')
        );
        if (isConnError) {
            setServerConnectionStatus(false, 'Connection lost', getTransactions().length > 0);
            showEditModalError('Connection lost: Server is offline. Your changes are preserved — please retry once server is back online.');
        } else {
            showEditModalError(err.message || 'Failed to update transaction. Please try again.');
        }
    }
}

/**
 * Handle row-level delete triggered from the transaction table.
 * @param {string} id — Transaction ID from the store.
 */
async function handleDelete(id) {
    if (!id) return;
    try {
        const removed = await deleteTransaction(id);
        if (removed) {
            await refreshApp();
            showEditModalToast('Transaction deleted.', 'info');
        }
    } catch (err) {
        const isConnError = err.message && (
            err.message.includes('Unable to connect') ||
            err.message.includes('Failed to fetch') ||
            err.message.includes('NetworkError')
        );
        if (isConnError) {
            setServerConnectionStatus(false, 'Connection lost', getTransactions().length > 0);
            showEditModalToast('Connection lost: Unable to delete transaction while server is offline.', 'error');
        } else {
            showEditModalToast(err.message || 'Failed to delete transaction.', 'error');
        }
    }
}

// ─── Initialisation ───────────────────────────────────────────────────────────

/**
 * Bootstrap the application.
 * Called once when the DOM is ready.
 */
async function init() {
    // 0. Register global retry handler for offline banner button
    window._kharchaSenseRetrySync = async () => {
        if (isAuthenticated()) {
            try {
                await reloadForUser();
            } catch (err) {
                console.warn('[RetrySync] Server still unreachable:', err);
            }
        }
        await refreshApp();
    };

    // 1. Navigation — must come first so section switching is active before any
    //    other module renders content (e.g. charts inside the overview section).
    initNavigation(refreshApp);

    // 2. Initialise UI modules (render shells / placeholders)
    initDashboard();
    initAnalyticsView();
    initAnomalyView();
    initForm();
    initFilters(renderFilteredTable);
    initTransactionTable(handleDelete, handleEdit);  // pass delete and edit callbacks
    initEditModal(handleUpdateSave);                 // initialize edit modal controller
    initDateRangePicker(refreshApp);                 // date range picker in top navbar
    initCSVImport(refreshApp);                       // CSV bulk import and sample template handler

    // 3. Attach submit handler after initForm() has injected the form element
    const form = document.getElementById('expense-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // 4. Initial load: If user is authenticated, fetch latest authoritative transactions from MongoDB
    if (isAuthenticated()) {
        try {
            await reloadForUser();
        } catch (loadErr) {
            console.error('[app.init] Could not load transactions from MongoDB:', loadErr);
            setServerConnectionStatus(false, 'Unable to sync with server', false);
            renderTableError('Unable to load transactions from MongoDB. Please verify that the backend server is running and reload.');
            renderDashboardUnavailable('Server connection lost.');
            renderAllChartsUnavailable('Server unavailable. Could not fetch analytics data from backend.');
            renderAnalyticsUnavailable('Server connection lost.');
            renderAnomalyUnavailable('Server connection lost.');
        }
    }

    // Refresh application UI (metrics, charts, anomaly cards, transaction table)
    await refreshApp();

    // 5. Initialize Landing Page scroll reveals, navbar blur, and triggers
    initLandingPage();

    // 6. Initialize Authentication Modal and dynamic user display
    initAuthModal(async () => {
        updateNavbarUserDisplay();
        clearInMemoryState(); // Guarantee immediate wipe of prior in-memory state before loading new account
        try {
            await reloadForUser();   // fetch authenticated user's transactions from MongoDB
        } catch (authLoadErr) {
            console.error('[app.authModal] reloadForUser failed after auth:', authLoadErr);
            renderTableError('Failed to load transactions for authenticated user.');
        }
        refreshApp();
        showDashboard('overview');
    });

    updateNavbarUserDisplay();
}

document.addEventListener('DOMContentLoaded', init);
