/**
 * navigation.js — Sidebar Navigation Module
 *
 * Handles:
 *   - Nav link clicks  → show/hide page sections
 *   - Mobile sidebar   → hamburger toggle + overlay dismiss
 *   - Navbar meta      → page title / subtitle updates
 *   - Quick-nav buttons → "Add Transaction" and "View All" shortcuts
 *
 * Exports:
 *   initNavigation(onRefresh)  — Boot the module; pass the app refresh callback.
 *   navigateTo(sectionId)      — Programmatically switch the active section.
 */

// ─── Section metadata ────────────────────────────────────────────────────────

const PAGE_META = {
    'overview': {
        title:    'Overview',
        subtitle: 'Your expense summary at a glance',
    },
    'analytics': {
        title:    'Analytics',
        subtitle: 'Detailed spending analysis and trends',
    },
    'transactions': {
        title:    'Transactions',
        subtitle: 'Add, manage, and review all your transactions',
    },
    'anomaly-insights': {
        title:    'Anomaly Insights',
        subtitle: 'Statistical outlier detection and reporting',
    },
};

// ─── Module state ────────────────────────────────────────────────────────────

let _currentSection = 'overview';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the navigation module.
 * @param {Function} [onRefresh] - Optional callback invoked when the user
 *   triggers a manual refresh (reserved for future refresh button).
 */
export function initNavigation(onRefresh) {
    _bindNavLinks();
    _bindSidebarToggle();
    _bindNavbarActions();
}

/**
 * Switch the visible section and update all navigation state.
 * Safe to call with an invalid sectionId (silently ignored).
 * @param {string} sectionId - One of 'overview' | 'analytics' | 'transactions' | 'anomaly-insights'
 */
export function navigateTo(sectionId) {
    if (!PAGE_META[sectionId]) return;

    // 1. Hide all sections
    document.querySelectorAll('.page-section').forEach(s => {
        s.classList.remove('page-section--active');
    });

    // 2. Reveal target section
    const target = document.getElementById(`section-${sectionId}`);
    if (target) {
        target.classList.add('page-section--active');
    }

    // 3. Update active nav link highlight
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });

    // 4. Update top navbar page title / subtitle
    const meta = PAGE_META[sectionId];
    const titleEl    = document.getElementById('page-title');
    const subtitleEl = document.getElementById('page-subtitle');
    if (titleEl)    titleEl.textContent    = meta.title;
    if (subtitleEl) subtitleEl.textContent = meta.subtitle;

    // 5. Close mobile sidebar after navigation
    _closeMobileSidebar();

    _currentSection = sectionId;
}

/**
 * Returns the ID of the currently active section.
 * @returns {string}
 */
export function getCurrentSection() {
    return _currentSection;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function _bindNavLinks() {
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', () => {
            navigateTo(link.dataset.section);
        });
    });
}

function _bindSidebarToggle() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const overlay   = document.getElementById('sidebar-overlay');
    const sidebar   = document.getElementById('app-sidebar');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            const isNowOpen = sidebar.classList.toggle('sidebar--open');
            if (overlay) {
                overlay.classList.toggle('overlay--visible', isNowOpen);
            }
        });
    }

    if (overlay) {
        overlay.addEventListener('click', _closeMobileSidebar);
    }
}

function _bindNavbarActions() {
    // "Add Transaction" button in the top navbar → go straight to transactions
    const addBtn = document.getElementById('btn-add-transaction-nav');
    if (addBtn) {
        addBtn.addEventListener('click', () => navigateTo('transactions'));
    }

    // "View All Transactions" shortcut on the Overview recent-transactions panel
    const viewAllBtn = document.getElementById('btn-view-all-transactions');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => navigateTo('transactions'));
    }
}

function _closeMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('sidebar--open');
    if (overlay) overlay.classList.remove('overlay--visible');
}
