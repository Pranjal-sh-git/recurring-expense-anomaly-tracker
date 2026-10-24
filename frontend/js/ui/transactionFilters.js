/**
 * transactionFilters.js — Transaction Search, Filtering, and Sorting UI Module
 *
 * Provides client-side filtering and sorting for the transaction list.
 * Does NOT modify LocalStorage or transaction store state.
 *
 * Exports:
 *   initFilters(onFilterChange)    — Renders filter controls into #transaction-filter-container
 *                                    and registers change listeners.
 *   applyFilters(transactions)     — Returns a filtered and sorted copy of the transaction array.
 *   resetFilters()                 — Resets filter fields to defaults.
 */

let _onFilterChangeCallback = null;

/**
 * Filter state object holding current control values.
 */
const _filterState = {
    search: '',
    category: '',
    type: '',  // '', 'recurring', 'oneoff'
    status: '',  // '', 'normal', 'anomaly'
    sort: 'newest', // 'newest', 'oldest', 'amount-desc', 'amount-asc'
};

/**
 * Initialise the filter toolbar component.
 *
 * @param {Function} onFilterChange — Callback function to trigger UI re-rendering when filters change.
 */
export function initFilters(onFilterChange) {
    _onFilterChangeCallback = typeof onFilterChange === 'function' ? onFilterChange : null;

    const container = document.getElementById('transaction-filter-container');
    if (!container) return;

    container.innerHTML = `
        <div class="filter-toolbar">
            <div class="filter-row filter-row--main">
                <!-- Search box -->
                <div class="filter-search-wrap">
                    <svg class="filter-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                        type="text"
                        id="filter-search"
                        class="filter-input"
                        placeholder="Search merchant or title..."
                        aria-label="Search transactions"
                    />
                </div>

                <!-- Reset button -->
                <button type="button" id="filter-reset" class="btn-filter-reset" title="Reset all filters">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                    </svg>
                    Reset
                </button>
            </div>

            <div class="filter-row filter-row--selects">
                <!-- Category filter -->
                <div class="filter-group">
                    <label for="filter-category" class="filter-label">Category</label>
                    <select id="filter-category" class="filter-select">
                        <option value="">All Categories</option>
                        <option value="Subscriptions">Subscriptions</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Rent">Rent</option>
                        <option value="Groceries">Groceries</option>
                        <option value="Dining">Dining</option>
                        <option value="Shopping">Shopping</option>
                        <option value="Transport">Transport</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Food">Food</option> 
                        <option value="Other">Other</option>
                    </select>
                </div>

                <!-- Type filter -->
                <div class="filter-group">
                    <label for="filter-type" class="filter-label">Type</label>
                    <select id="filter-type" class="filter-select">
                        <option value="">All Types</option>
                        <option value="recurring">Recurring</option>
                        <option value="oneoff">One-off</option>
                    </select>
                </div>

                <!-- Anomaly status filter -->
                <div class="filter-group">
                    <label for="filter-status" class="filter-label">Status</label>
                    <select id="filter-status" class="filter-select">
                        <option value="">All Statuses</option>
                        <option value="normal">Normal</option>
                        <option value="anomaly">Anomaly</option>
                    </select>
                </div>

                <!-- Sort select -->
                <div class="filter-group">
                    <label for="filter-sort" class="filter-label">Sort By</label>
                    <select id="filter-sort" class="filter-select">
                        <option value="newest">Newest Date</option>
                        <option value="oldest">Oldest Date</option>
                        <option value="amount-desc">Highest Amount</option>
                        <option value="amount-asc">Lowest Amount</option>
                    </select>
                </div>
            </div>

            <!-- Filter Result Counter / Summary -->
            <div class="filter-summary">
                <span id="filter-count-label">Showing all transactions</span>
            </div>
        </div>
    `;

    // Attach event listeners
    const searchInput = document.getElementById('filter-search');
    const categorySelect = document.getElementById('filter-category');
    const typeSelect = document.getElementById('filter-type');
    const statusSelect = document.getElementById('filter-status');
    const sortSelect = document.getElementById('filter-sort');
    const resetButton = document.getElementById('filter-reset');

    const handleInput = () => {
        _filterState.search = searchInput ? searchInput.value.trim().toLowerCase() : '';
        _filterState.category = categorySelect ? categorySelect.value : '';
        _filterState.type = typeSelect ? typeSelect.value : '';
        _filterState.status = statusSelect ? statusSelect.value : '';
        _filterState.sort = sortSelect ? sortSelect.value : 'newest';

        if (_onFilterChangeCallback) {
            _onFilterChangeCallback();
        }
    };

    if (searchInput) searchInput.addEventListener('input', handleInput);
    if (categorySelect) categorySelect.addEventListener('change', handleInput);
    if (typeSelect) typeSelect.addEventListener('change', handleInput);
    if (statusSelect) statusSelect.addEventListener('change', handleInput);
    if (sortSelect) sortSelect.addEventListener('change', handleInput);

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            resetFilters();
            if (_onFilterChangeCallback) {
                _onFilterChangeCallback();
            }
        });
    }
}

/**
 * Reset filter controls and internal state to initial values.
 */
export function resetFilters() {
    _filterState.search = '';
    _filterState.category = '';
    _filterState.type = '';
    _filterState.status = '';
    _filterState.sort = 'newest';

    const searchInput = document.getElementById('filter-search');
    const categorySelect = document.getElementById('filter-category');
    const typeSelect = document.getElementById('filter-type');
    const statusSelect = document.getElementById('filter-status');
    const sortSelect = document.getElementById('filter-sort');

    if (searchInput) searchInput.value = '';
    if (categorySelect) categorySelect.value = '';
    if (typeSelect) typeSelect.value = '';
    if (statusSelect) statusSelect.value = '';
    if (sortSelect) sortSelect.value = 'newest';
}

/**
 * Apply current filter and sort settings to an array of transaction objects.
 *
 * @param {Array<object>} transactions — Array of transactions (optionally anomaly-enriched).
 * @returns {Array<object>} Filtered and sorted array of transactions.
 */
export function applyFilters(transactions) {
    if (!Array.isArray(transactions)) return [];

    const totalCount = transactions.length;

    let result = transactions.filter(tx => {
        if (!tx) return false;

        // 1. Search text filter (title or merchant name)
        if (_filterState.search) {
            const title = String(tx.title || '').toLowerCase();
            const category = String(tx.category || '').toLowerCase();
            if (!title.includes(_filterState.search) && !category.includes(_filterState.search)) {
                return false;
            }
        }

        // 2. Category filter
        if (_filterState.category && tx.category !== _filterState.category) {
            return false;
        }

        // 3. Type filter (recurring vs oneoff)
        if (_filterState.type === 'recurring' && !tx.recurring) {
            return false;
        }
        if (_filterState.type === 'oneoff' && tx.recurring) {
            return false;
        }

        // 4. Anomaly status filter
        if (_filterState.status === 'anomaly' && !tx.isAnomaly) {
            return false;
        }
        if (_filterState.status === 'normal' && tx.isAnomaly) {
            return false;
        }

        return true;
    });

    // 5. Sorting
    result.sort((a, b) => {
        const amtA = Number(a.amount) || 0;
        const amtB = Number(b.amount) || 0;
        const dateA = a.date || '';
        const dateB = b.date || '';

        switch (_filterState.sort) {
            case 'oldest':
                return dateA.localeCompare(dateB);
            case 'amount-desc':
                return amtB - amtA;
            case 'amount-asc':
                return amtA - amtB;
            case 'newest':
            default:
                return dateB.localeCompare(dateA);
        }
    });

    // Update filter counter label
    const countLabel = document.getElementById('filter-count-label');
    if (countLabel) {
        if (totalCount === 0) {
            countLabel.textContent = 'No transactions recorded';
        } else if (result.length === totalCount) {
            countLabel.textContent = `Showing all ${totalCount} transaction${totalCount !== 1 ? 's' : ''}`;
        } else {
            countLabel.textContent = `Showing ${result.length} of ${totalCount} transaction${totalCount !== 1 ? 's' : ''}`;
        }
    }

    return result;
}
