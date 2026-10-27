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
import { getActiveDateRange } from './dateRangePicker.js';

// ─── Element ID map ───────────────────────────────────────────────────────────

const ELEMENT_IDS = {
    totalExpenses:        'total-expenses-value',
    totalTransactions:    'total-transactions-value',
    anomaliesDetected:    'anomalies-value',
    highestCategory:      'highest-category-value',
    recurringCount:       'recurring-count-value',
    sidebarTotal:         'sidebar-record-count',
    sidebarAnomalies:     'sidebar-anomaly-count',
    sidebarSyncStatus:    'sidebar-sync-status',
    sidebarSyncDot:       'sidebar-sync-dot',
    sidebarSyncText:      'sidebar-sync-text',
    sidebarAnomalyStatus: 'sidebar-anomaly-status',
    sidebarAnomalyDot:    'sidebar-anomaly-dot',
    sidebarAnomalyText:   'sidebar-anomaly-text',
    globalBanner:         'global-connection-banner',
    recentList:           'recent-transactions-list',
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

// ─── Connection Status & Unavailable State APIs ───────────────────────────────

/**
 * Update the sidebar and global server connection indicator.
 *
 * @param {boolean} isOnline - Whether the backend server is reachable and active.
 * @param {string|null} [statusMessage] - Custom status text (e.g. 'Synced with server', 'Connection lost').
 * @param {boolean} [isInMemory] - Whether transactions currently displayed are in-memory (offline) vs freshly synced.
 */
export function setServerConnectionStatus(isOnline, statusMessage = null, isInMemory = false) {
    const statusEl   = document.getElementById(ELEMENT_IDS.sidebarSyncStatus);
    const dotEl      = document.getElementById(ELEMENT_IDS.sidebarSyncDot);
    const textEl     = document.getElementById(ELEMENT_IDS.sidebarSyncText);
    const bannerEl   = document.getElementById(ELEMENT_IDS.globalBanner);
    const anomTextEl = document.getElementById(ELEMENT_IDS.sidebarAnomalyText);

    if (isOnline) {
        if (statusEl) statusEl.className = 'src-status';
        if (dotEl) dotEl.className = 'status-pulse-dot';
        if (textEl) textEl.textContent = statusMessage || 'Synced just now';
        if (anomTextEl) anomTextEl.textContent = 'Active alerts';

        if (bannerEl) {
            bannerEl.style.display = 'none';
            bannerEl.innerHTML = '';
        }
    } else {
        if (statusEl) statusEl.className = 'src-status src-status--danger';
        if (dotEl) dotEl.className = 'status-pulse-dot status-pulse-dot--danger';
        if (textEl) {
            textEl.textContent = statusMessage || (isInMemory ? 'Connection lost (In-memory)' : 'Unable to sync with server');
        }
        if (anomTextEl) anomTextEl.textContent = 'Server offline';

        if (bannerEl) {
            bannerEl.style.display = 'block';
            if (isInMemory) {
                bannerEl.innerHTML = `
                    <div class="server-status-banner server-status-banner--danger">
                        <div class="ssb-content">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            <div class="ssb-text">
                                <strong>Backend Connection Lost</strong>
                                <span>Unable to sync with Express server. Displaying previously loaded in-memory records. Any newly created transactions cannot be saved until the backend reconnects.</span>
                            </div>
                        </div>
                        <button type="button" class="btn-retry-sync" id="btn-banner-retry">Retry Connection</button>
                    </div>
                `;
            } else {
                bannerEl.innerHTML = `
                    <div class="server-status-banner server-status-banner--danger">
                        <div class="ssb-content">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            <div class="ssb-text">
                                <strong>Unable to Connect to Server</strong>
                                <span>KharchaSense backend on port 5000 is unreachable. Live MongoDB transactions, metrics, and anomaly insights cannot be loaded.</span>
                            </div>
                        </div>
                        <button type="button" class="btn-retry-sync" id="btn-banner-retry">Retry Connection</button>
                    </div>
                `;
            }

            const retryBtn = document.getElementById('btn-banner-retry');
            if (retryBtn && typeof window._kharchaSenseRetrySync === 'function') {
                retryBtn.addEventListener('click', window._kharchaSenseRetrySync);
            }
        }
    }
}

/**
 * Render explicit unavailable states for Overview metrics, recurring commitment card,
 * monthly summary card, and recent transactions feed when server is disconnected.
 *
 * @param {string} [errorMessage]
 */
export function renderDashboardUnavailable(errorMessage = 'Server connection lost.') {
    setText(ELEMENT_IDS.totalExpenses,     '--');
    setText(ELEMENT_IDS.totalTransactions, '--');
    setText(ELEMENT_IDS.anomaliesDetected, '--');
    setText(ELEMENT_IDS.highestCategory,   '--');
    setText(ELEMENT_IDS.recurringCount,    '--');
    setText(ELEMENT_IDS.sidebarTotal,      '--');
    setText(ELEMENT_IDS.sidebarAnomalies,  '--');

    const totalExpCard = document.getElementById('total-expenses-card');
    if (totalExpCard) {
        const badge = totalExpCard.querySelector('.comp-badge');
        const text  = totalExpCard.querySelector('.comp-text');
        if (badge) { badge.textContent = 'Offline'; badge.className = 'comp-badge comp-badge--danger'; }
        if (text) text.textContent = 'server disconnected';
    }

    const totalTxCard = document.getElementById('total-transactions-card');
    if (totalTxCard) {
        const badge = totalTxCard.querySelector('.comp-badge');
        const text  = totalTxCard.querySelector('.comp-text');
        if (badge) { badge.textContent = 'Offline'; badge.className = 'comp-badge comp-badge--danger'; }
        if (text) text.textContent = 'server disconnected';
    }

    const highestCard = document.getElementById('highest-spending-card');
    if (highestCard) {
        const text = highestCard.querySelector('.comp-text');
        if (text) text.textContent = 'Data unavailable';
    }

    const recCard = document.getElementById('recurring-count-card');
    if (recCard) {
        const badge = recCard.querySelector('.comp-badge');
        const text  = recCard.querySelector('.comp-text');
        if (badge) { badge.textContent = 'Offline'; badge.className = 'comp-badge comp-badge--danger'; }
        if (text) text.textContent = 'server disconnected';
    }

    const recOverviewCard = document.getElementById('overview-recurring-card');
    if (recOverviewCard) {
        recOverviewCard.innerHTML = `
            <div class="insight-card-header">
                <h3 class="insight-card-title">Recurring Commitment</h3>
                <span class="insight-card-desc">Server unavailable</span>
            </div>
            <div class="empty-state empty-state--error" style="padding: 1.5rem 1rem;">
                <span class="empty-state-icon" aria-hidden="true">⚠️</span>
                <p class="empty-state-text" style="color:var(--danger);font-weight:600;font-size:0.85rem;">Server connection lost</p>
                <p class="empty-state-hint" style="font-size:0.75rem;">Cannot calculate recurring commitments while backend is offline.</p>
            </div>
        `;
    }

    const summaryOverviewCard = document.getElementById('overview-summary-card');
    if (summaryOverviewCard) {
        summaryOverviewCard.innerHTML = `
            <div class="insight-card-header">
                <h3 class="insight-card-title">Monthly Summary</h3>
                <span class="insight-card-desc">Server unavailable</span>
            </div>
            <div class="empty-state empty-state--error" style="padding: 1.5rem 1rem;">
                <span class="empty-state-icon" aria-hidden="true">⚠️</span>
                <p class="empty-state-text" style="color:var(--danger);font-weight:600;font-size:0.85rem;">Analytics unavailable</p>
                <p class="empty-state-hint" style="font-size:0.75rem;">Unable to load monthly spending summary from server.</p>
            </div>
        `;
    }

    const recentList = document.getElementById(ELEMENT_IDS.recentList);
    if (recentList) {
        recentList.innerHTML = `
            <div class="empty-state empty-state--error" style="padding: 1.5rem 1rem;">
                <span class="empty-state-icon" aria-hidden="true">⚠️</span>
                <p class="empty-state-text" style="color:var(--danger);font-weight:600;font-size:0.85rem;">Recent transactions unavailable</p>
                <p class="empty-state-hint" style="font-size:0.75rem;">Unable to retrieve recent transactions from MongoDB server.</p>
            </div>
        `;
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
    setText(ELEMENT_IDS.recurringCount,    '₹0.00');
    setText(ELEMENT_IDS.sidebarTotal,      '0');
    setText(ELEMENT_IDS.sidebarAnomalies,  '0');

    _updateMetricComparisons([]);

    const highestCard = document.getElementById('highest-spending-card');
    if (highestCard) {
        const text = highestCard.querySelector('.comp-text');
        if (text) text.textContent = '0% of total expenses';
    }

    const recCard = document.getElementById('recurring-count-card');
    if (recCard) {
        const badge = recCard.querySelector('.comp-badge');
        const text  = recCard.querySelector('.comp-text');
        if (badge) {
            badge.textContent = '0';
            badge.className   = 'comp-badge comp-badge--neutral';
        }
        if (text) text.textContent = 'recurring entries';
    }

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
 * @param {Array<object>} [filteredTransactions]   - Active date-filtered transaction objects.
 */
export function updateDashboard({
    totalExpenses,
    totalTransactions,
    anomaliesDetected,
    highestCategory,
} = {}, filteredTransactions = null, backendData = null) {
    const transactions = Array.isArray(filteredTransactions) ? filteredTransactions : getTransactions();

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

    _updateMetricComparisons(transactions);

    // Update secondary overview insight cards
    _updateOverviewRecurring(transactions, backendData?.recurring);
    _updateOverviewSummary(transactions, backendData?.summary, backendData?.anomalySummary);
}

/**
 * Count transactions flagged as recurring and update the recurring-count card.
 * @param {Array<object>} transactions - Raw transaction array from the store.
 * @param {object} [backendRecurring] - Optional pre-computed backend recurring metrics.
 */
export function updateRecurringCount(transactions, backendRecurring = null) {
    let count, total;
    if (backendRecurring && (backendRecurring.recurring || backendRecurring.recurringSpend !== undefined)) {
        total = Number(backendRecurring.recurring?.total ?? backendRecurring.recurringSpend ?? 0);
        count = Number(backendRecurring.recurring?.count ?? backendRecurring.recurringCount ?? 0);
    } else {
        if (!Array.isArray(transactions)) return;
        const recurringTxs = transactions.filter(t => Boolean(t.recurring));
        count = recurringTxs.length;
        total = recurringTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    }
    
    // Set the amount as value
    setText(ELEMENT_IDS.recurringCount, formatCurrency(total));
    
    // Set comparison sub text
    const parent = document.getElementById('recurring-count-card');
    if (parent) {
        const badge = parent.querySelector('.comp-badge');
        const text = parent.querySelector('.comp-text');
        if (badge) {
            badge.textContent = count > 0 ? `↑ ${count}` : '0';
            badge.className = count > 0 ? 'comp-badge comp-badge--neutral' : 'comp-badge comp-badge--neutral';
        }
        if (text) text.textContent = `recurring entries`;
    }
}

/**
 * Update comparison badges for Total Expenses, Total Transactions, and Anomalies Detected cards.
 * Always computes current metrics directly from the active filtered transaction list so main text values
 * and comparison badges are 100% consistent.
 *
 * @param {Array<object>} transactions - Active filtered transaction objects.
 */
function _updateMetricComparisons(transactions) {
    const expCard  = document.getElementById('total-expenses-card');
    const txCard   = document.getElementById('total-transactions-card');
    const anomCard = document.getElementById('anomalies-detected-card');

    const activeList = Array.isArray(transactions) ? transactions : [];
    const analyzedCurr = detectAnomalies(activeList);

    // Current metrics derived STRICTLY from activeList (matches main card numbers)
    const currTotal = activeList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const currCount = activeList.length;
    const currAnomalies = analyzedCurr.filter(t => Boolean(t.isAnomaly)).length;

    const dateRange = getActiveDateRange();
    const isFilteredRange = Boolean(dateRange && dateRange.type !== 'all' && (dateRange.startDate || dateRange.endDate));

    let prevData = null;
    let comparisonLabel = 'vs last month';

    if (isFilteredRange) {
        comparisonLabel = 'vs prev period';

        // Determine previous period bounds if startDate and endDate exist
        if (dateRange.startDate && dateRange.endDate) {
            const start = new Date(dateRange.startDate);
            const end = new Date(dateRange.endDate);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                const diffMs = end.getTime() - start.getTime();
                const durationDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

                const prevEnd = new Date(start.getTime() - (24 * 60 * 60 * 1000));
                const prevStart = new Date(prevEnd.getTime() - ((durationDays - 1) * 24 * 60 * 60 * 1000));

                const pStartStr = prevStart.toISOString().slice(0, 10);
                const pEndStr = prevEnd.toISOString().slice(0, 10);

                const allRaw = getTransactions();
                const prevTransactions = allRaw.filter(t => {
                    if (!t || !t.date) return false;
                    const d = String(t.date).trim();
                    return d >= pStartStr && d <= pEndStr;
                });

                const analyzedPrev = detectAnomalies(prevTransactions);
                prevData = {
                    total: prevTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
                    count: prevTransactions.length,
                    anomalies: analyzedPrev.filter(t => Boolean(t.isAnomaly)).length,
                };
            }
        }
    } else {
        // "All Time" mode: compare latest month vs previous month
        comparisonLabel = 'vs last month';
        const allRaw = getTransactions();
        const analyzed = detectAnomalies(allRaw);
        const monthsMap = {};

        analyzed.forEach(t => {
            if (!t.date) return;
            const d = new Date(t.date);
            if (isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthsMap[key]) {
                monthsMap[key] = { total: 0, count: 0, anomalies: 0 };
            }
            monthsMap[key].total += Number(t.amount) || 0;
            monthsMap[key].count += 1;
            if (t.isAnomaly) {
                monthsMap[key].anomalies += 1;
            }
        });

        const sortedMonths = Object.keys(monthsMap).sort();
        if (sortedMonths.length > 1) {
            const prevKey = sortedMonths[sortedMonths.length - 2];
            prevData = monthsMap[prevKey];
        }
    }

    // 1. Total Expenses Comparison
    if (!prevData || prevData.total === 0) {
        _setCardComparison(expCard, '0%', 'comp-badge--neutral', comparisonLabel);
    } else {
        const diffPct = ((currTotal - prevData.total) / prevData.total) * 100;
        if (Math.abs(diffPct) < 0.1) {
            _setCardComparison(expCard, '0%', 'comp-badge--neutral', comparisonLabel);
        } else if (diffPct > 0) {
            _setCardComparison(expCard, `↑ ${diffPct.toFixed(1)}%`, 'comp-badge--green', comparisonLabel);
        } else {
            _setCardComparison(expCard, `↓ ${Math.abs(diffPct).toFixed(1)}%`, 'comp-badge--green', comparisonLabel);
        }
    }

    // 2. Total Transactions Comparison
    if (!prevData) {
        _setCardComparison(txCard, '0', 'comp-badge--neutral', comparisonLabel);
    } else {
        const countDiff = currCount - prevData.count;
        if (countDiff > 0) {
            _setCardComparison(txCard, `↑ ${countDiff}`, 'comp-badge--neutral', comparisonLabel);
        } else if (countDiff < 0) {
            _setCardComparison(txCard, `↓ ${Math.abs(countDiff)}`, 'comp-badge--neutral', comparisonLabel);
        } else {
            _setCardComparison(txCard, '0', 'comp-badge--neutral', comparisonLabel);
        }
    }

    // 3. Anomalies Detected Comparison
    if (currAnomalies === 0) {
        _setCardComparison(anomCard, '0', 'comp-badge--neutral', comparisonLabel);
    } else if (!prevData) {
        _setCardComparison(anomCard, `↑ ${currAnomalies}`, 'comp-badge--danger', comparisonLabel);
    } else {
        const anomDiff = currAnomalies - prevData.anomalies;
        if (anomDiff > 0) {
            _setCardComparison(anomCard, `↑ ${anomDiff}`, 'comp-badge--danger', comparisonLabel);
        } else if (anomDiff < 0) {
            _setCardComparison(anomCard, `↓ ${Math.abs(anomDiff)}`, 'comp-badge--green', comparisonLabel);
        } else {
            _setCardComparison(anomCard, '0', 'comp-badge--neutral', comparisonLabel);
        }
    }
}

function _setCardComparison(cardEl, badgeText, badgeClass, textContent) {
    if (!cardEl) return;
    const badge = cardEl.querySelector('.comp-badge');
    const text  = cardEl.querySelector('.comp-text');
    if (badge) {
        badge.textContent = badgeText;
        badge.className   = `comp-badge ${badgeClass}`;
    }
    if (text) {
        text.textContent = textContent;
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
function _updateOverviewRecurring(transactions, backendRecurring = null) {
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

    let recPct, oneOffPct, recurringSpend, oneOffSpend;

    if (backendRecurring && (backendRecurring.recurring || backendRecurring.recurringSpend !== undefined)) {
        recPct = Number(backendRecurring.recurring?.percentage ?? backendRecurring.recurringPct ?? 0);
        oneOffPct = Number(backendRecurring.nonRecurring?.percentage ?? backendRecurring.oneOffPct ?? 0);
        recurringSpend = Number(backendRecurring.recurring?.total ?? backendRecurring.recurringSpend ?? 0);
        oneOffSpend = Number(backendRecurring.nonRecurring?.total ?? backendRecurring.oneOffSpend ?? 0);
    } else {
        const total = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const recurringTxs = transactions.filter(t => Boolean(t.recurring));
        recurringSpend = recurringTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        oneOffSpend = Math.max(0, total - recurringSpend);

        recPct = total > 0 ? (recurringSpend / total) * 100 : 0;
        oneOffPct = total > 0 ? (oneOffSpend / total) * 100 : 0;
    }

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
function _updateOverviewSummary(transactions, backendSummary = null, backendAnomalySummary = null) {
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

    let avgAmount, totalCategoriesCount, anomalyRateStr, anomalyCount;
    let highestExpenseCategory = '--';
    let highestExpenseAmt = '₹0.00';

    const highestTx = [...transactions].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))[0];
    if (highestTx) {
        highestExpenseCategory = highestTx.category;
        highestExpenseAmt = formatCurrency(highestTx.amount);
    }

    if (backendSummary) {
        avgAmount = Number(backendSummary.averageTransactionSize ?? backendSummary.average ?? 0);
        const categories = new Set(transactions.map(t => t.category).filter(Boolean));
        totalCategoriesCount = categories.size;

        anomalyCount = backendAnomalySummary?.anomalyCount ?? 0;
        const totalTxs = backendSummary.totalTransactions || transactions.length;
        const anomalyRate = totalTxs > 0 ? (anomalyCount / totalTxs) * 100 : 0;
        anomalyRateStr = `${anomalyRate.toFixed(1)}%`;
    } else {
        const total = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const count = transactions.length;
        avgAmount = count > 0 ? total / count : 0;

        const categories = new Set(transactions.map(t => t.category).filter(Boolean));
        totalCategoriesCount = categories.size;

        // Detect anomalies locally for guest
        const analyzed = detectAnomalies(transactions);
        anomalyCount = analyzed.filter(t => Boolean(t.isAnomaly)).length;
        const anomalyRate = count > 0 ? (anomalyCount / count) * 100 : 0;
        anomalyRateStr = `${anomalyRate.toFixed(1)}%`;
    }

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

