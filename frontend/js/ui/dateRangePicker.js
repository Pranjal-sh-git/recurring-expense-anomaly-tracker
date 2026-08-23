/**
 * dateRangePicker.js — Top Navbar Date Range Filter Module
 *
 * Provides an interactive dropdown modal for filtering application-wide
 * transactions by date range presets or custom start/end dates.
 *
 * Exports:
 *   initDateRangePicker(onRangeChange)     — Initialize listeners and DOM bindings.
 *   getActiveDateRange()                   — Returns current date range configuration.
 *   filterTransactionsByDate(transactions) — Filters transaction array by active range.
 *   setDateRange(rangeConfig)              — Programmatically update active range.
 */

// ─── Module state ────────────────────────────────────────────────────────────

let _onRangeChangeCallback = null;

let _activeRange = {
    type: 'all',          // 'all' | 'this-month' | 'last-30' | 'last-90' | 'this-year' | 'custom'
    startDate: null,      // 'YYYY-MM-DD' | null
    endDate: null,        // 'YYYY-MM-DD' | null
    label: 'All Time',    // Display string in navbar
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

function formatDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${monthName} ${parseInt(d, 10)}, ${y}`;
}

function calculatePresetRange(presetType) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (presetType) {
        case 'this-month': {
            const start = new Date(currentYear, currentMonth, 1);
            const end = new Date(currentYear, currentMonth + 1, 0);
            const startStr = formatDate(start);
            const endStr = formatDate(end);
            return {
                type: 'this-month',
                startDate: startStr,
                endDate: endStr,
                label: `${formatDisplayDate(startStr)} - ${formatDisplayDate(endStr)}`,
            };
        }
        case 'last-30': {
            const start = new Date();
            start.setDate(now.getDate() - 30);
            const startStr = formatDate(start);
            const endStr = formatDate(now);
            return {
                type: 'last-30',
                startDate: startStr,
                endDate: endStr,
                label: 'Last 30 Days',
            };
        }
        case 'last-90': {
            const start = new Date();
            start.setDate(now.getDate() - 90);
            const startStr = formatDate(start);
            const endStr = formatDate(now);
            return {
                type: 'last-90',
                startDate: startStr,
                endDate: endStr,
                label: 'Last 90 Days',
            };
        }
        case 'this-year': {
            const start = new Date(currentYear, 0, 1);
            const end = new Date(currentYear, 11, 31);
            const startStr = formatDate(start);
            const endStr = formatDate(end);
            return {
                type: 'this-year',
                startDate: startStr,
                endDate: endStr,
                label: `Year ${currentYear}`,
            };
        }
        case 'all':
        default:
            return {
                type: 'all',
                startDate: null,
                endDate: null,
                label: 'All Time',
            };
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Filter an array of transactions according to current active date range.
 * @param {Array<Object>} transactions
 * @returns {Array<Object>}
 */
export function filterTransactionsByDate(transactions) {
    if (!Array.isArray(transactions)) return [];
    if (!_activeRange || _activeRange.type === 'all' || (!_activeRange.startDate && !_activeRange.endDate)) {
        return transactions;
    }

    return transactions.filter(tx => {
        if (!tx || !tx.date) return false;
        const txDate = String(tx.date).trim();
        if (_activeRange.startDate && txDate < _activeRange.startDate) return false;
        if (_activeRange.endDate && txDate > _activeRange.endDate) return false;
        return true;
    });
}

/**
 * Get current active date range configuration.
 * @returns {Object}
 */
export function getActiveDateRange() {
    return { ..._activeRange };
}

/**
 * Programmatically set active date range.
 * @param {Object} rangeConfig
 */
export function setDateRange(rangeConfig) {
    if (!rangeConfig) return;
    _activeRange = {
        type: rangeConfig.type || 'all',
        startDate: rangeConfig.startDate || null,
        endDate: rangeConfig.endDate || null,
        label: rangeConfig.label || 'All Time',
    };
    _updateTriggerLabel();
    _updateActivePresetUI();
    if (typeof _onRangeChangeCallback === 'function') {
        _onRangeChangeCallback(_activeRange);
    }
}

/**
 * Initialize Date Range Picker UI and events.
 * @param {Function} onRangeChange — Callback function invoked when range updates.
 */
export function initDateRangePicker(onRangeChange) {
    _onRangeChangeCallback = typeof onRangeChange === 'function' ? onRangeChange : null;

    const trigger = document.getElementById('navbar-date-picker');
    const dropdown = document.getElementById('date-picker-dropdown');
    if (!trigger || !dropdown) return;

    // Toggle dropdown open / close
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('date-picker-dropdown--open');
        if (isOpen) {
            _closeDropdown();
        } else {
            _openDropdown();
        }
    });

    trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const isOpen = dropdown.classList.contains('date-picker-dropdown--open');
            if (isOpen) _closeDropdown();
            else _openDropdown();
        }
    });

    // Preset button clicks
    dropdown.querySelectorAll('.dp-preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const preset = btn.dataset.range;
            const newRange = calculatePresetRange(preset);
            _applyRange(newRange);
        });
    });

    // Custom date range apply
    const applyBtn = document.getElementById('dp-apply-btn');
    if (applyBtn) {
        applyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const startInput = document.getElementById('dp-start-date');
            const endInput = document.getElementById('dp-end-date');
            const startVal = startInput ? startInput.value : '';
            const endVal = endInput ? endInput.value : '';

            if (!startVal && !endVal) {
                _applyRange(calculatePresetRange('all'));
                return;
            }

            let label = 'Custom Range';
            if (startVal && endVal) {
                label = `${formatDisplayDate(startVal)} - ${formatDisplayDate(endVal)}`;
            } else if (startVal) {
                label = `From ${formatDisplayDate(startVal)}`;
            } else if (endVal) {
                label = `Until ${formatDisplayDate(endVal)}`;
            }

            _applyRange({
                type: 'custom',
                startDate: startVal || null,
                endDate: endVal || null,
                label,
            });
        });
    }

    // Reset button
    const resetBtn = document.getElementById('dp-reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const startInput = document.getElementById('dp-start-date');
            const endInput = document.getElementById('dp-end-date');
            if (startInput) startInput.value = '';
            if (endInput) endInput.value = '';
            _applyRange(calculatePresetRange('all'));
        });
    }

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
            _closeDropdown();
        }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dropdown.classList.contains('date-picker-dropdown--open')) {
            _closeDropdown();
            trigger.focus();
        }
    });

    // Initialize UI state
    _updateTriggerLabel();
    _updateActivePresetUI();
}

// ─── Private UI Helpers ───────────────────────────────────────────────────────

function _openDropdown() {
    const trigger = document.getElementById('navbar-date-picker');
    const dropdown = document.getElementById('date-picker-dropdown');
    if (!dropdown || !trigger) return;

    dropdown.classList.add('date-picker-dropdown--open');
    trigger.classList.add('navbar-date-picker--active');
    trigger.setAttribute('aria-expanded', 'true');
    dropdown.setAttribute('aria-hidden', 'false');
}

function _closeDropdown() {
    const trigger = document.getElementById('navbar-date-picker');
    const dropdown = document.getElementById('date-picker-dropdown');
    if (!dropdown || !trigger) return;

    dropdown.classList.remove('date-picker-dropdown--open');
    trigger.classList.remove('navbar-date-picker--active');
    trigger.setAttribute('aria-expanded', 'false');
    dropdown.setAttribute('aria-hidden', 'false');
}

function _applyRange(newRange) {
    _activeRange = newRange;
    _updateTriggerLabel();
    _updateActivePresetUI();
    _closeDropdown();

    if (typeof _onRangeChangeCallback === 'function') {
        _onRangeChangeCallback(_activeRange);
    }
}

function _updateTriggerLabel() {
    const labelEl = document.getElementById('navbar-date-label');
    if (labelEl) {
        labelEl.textContent = _activeRange.label || 'All Time';
    }
}

function _updateActivePresetUI() {
    const dropdown = document.getElementById('date-picker-dropdown');
    if (!dropdown) return;

    dropdown.querySelectorAll('.dp-preset-btn').forEach(btn => {
        const isSelected = btn.dataset.range === _activeRange.type;
        btn.classList.toggle('dp-preset-btn--active', isSelected);
    });
}
