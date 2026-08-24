/**
 * navigation.js — Application Navigation & View Routing Module
 *
 * Handles:
 *   - Landing Page vs Dashboard View switching
 *   - Authentication protection for Dashboard routes
 *   - URL Hash based routing (#landing, #overview, #analytics, #transactions, #anomaly-insights)
 *   - Nav link clicks  → show/hide page sections
 *   - Mobile sidebar   → hamburger toggle + overlay dismiss
 *   - Navbar meta      → page title / subtitle updates
 *   - Quick-nav buttons → "Add Transaction" and "View All" shortcuts
 *
 * Exports:
 *   initNavigation(onRefresh)  — Boot the module; pass the app refresh callback.
 *   navigateTo(sectionId)      — Programmatically switch the active dashboard section.
 *   showLandingPage()          — Switch to the Landing Page initial view.
 *   showDashboard(sectionId)   — Switch to the Dashboard application view.
 *   getCurrentSection()        — Get active section ID.
 */

import { isAuthenticated, logout, updateNavbarUserDisplay } from '../services/authService.js';
import { openAuthModal, resetAuthForms } from './authModal.js';
import { reloadForUser } from '../state/transactionStore.js';

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
let _isDashboardActive = false;
let _refreshCallback = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the navigation module.
 * @param {Function} [onRefresh] - App refresh callback invoked on navigation.
 */
export function initNavigation(onRefresh) {
    _refreshCallback = onRefresh;

    _bindLandingActions();
    _bindNavLinks();
    _bindSidebarToggle();
    _bindNavbarActions();
    _bindDashboardReturnActions();

    // Listen for browser back/forward or hash change
    window.addEventListener('hashchange', _handleRouteFromHash);

    // Initial route dispatch on load
    _handleRouteFromHash();
}

/**
 * Synchronize Landing Page CTA buttons with the current authentication state.
 * If logged in: buttons display "Go to Dashboard".
 * If logged out: buttons display "Get Started" / "Explore Dashboard".
 */
export function updateLandingAuthState() {
    const navBtn  = document.getElementById('btn-landing-nav-explore');
    const heroBtn = document.getElementById('btn-hero-explore-dashboard');
    const darkBtn = document.getElementById('btn-dark-cta-explore');

    const loggedIn = isAuthenticated();

    if (navBtn) {
        const textSpan = navBtn.querySelector('span');
        if (textSpan) {
            textSpan.textContent = loggedIn ? 'Go to Dashboard' : 'Get Started';
        }
        navBtn.title = loggedIn ? 'Go to your KharchaSense Dashboard' : 'Get Started with KharchaSense';
    }

    if (heroBtn) {
        const textSpan = heroBtn.querySelector('span');
        if (textSpan) {
            textSpan.textContent = loggedIn ? 'Go to Dashboard' : 'Explore Dashboard';
        }
        heroBtn.title = loggedIn ? 'Go to your KharchaSense Dashboard' : 'Open KharchaSense Dashboard';
    }

    if (darkBtn) {
        const textSpan = darkBtn.querySelector('span');
        if (textSpan) {
            textSpan.textContent = loggedIn ? 'Go to Dashboard' : 'Explore Dashboard';
        }
    }
}

/**
 * Show the Landing Page view.
 */
export function showLandingPage() {
    _isDashboardActive = false;

    updateLandingAuthState();

    const landingEl = document.getElementById('landing-page-view');
    const dashboardEl = document.getElementById('app-dashboard-view');
    const overlay = document.getElementById('sidebar-overlay');

    if (landingEl)   landingEl.style.display   = 'flex';
    if (dashboardEl) dashboardEl.style.display = 'none';
    if (overlay)     overlay.style.display     = 'none';

    document.body.classList.remove('in-dashboard');
    document.body.classList.add('in-landing');

    if (window.location.hash !== '#landing' && window.location.hash !== '' && !window.location.hash.startsWith('#features') && !window.location.hash.startsWith('#how-it-works')) {
        window.history.replaceState(null, '', '#landing');
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
}

/**
 * Show the Dashboard view and navigate to a section.
 * Protected: requires authentication.
 * @param {string} [sectionId='overview']
 */
export function showDashboard(sectionId = 'overview') {
    // ── Authentication Check ──
    if (!isAuthenticated()) {
        showLandingPage();
        openAuthModal({
            tab: 'login',
            onSuccess: () => {
                reloadForUser();
                updateLandingAuthState();
                showDashboard(sectionId);
            }
        });
        return;
    }

    _isDashboardActive = true;

    // Synchronize transactions & user display for active session
    reloadForUser();
    updateNavbarUserDisplay();
    updateLandingAuthState();

    const landingEl = document.getElementById('landing-page-view');
    const dashboardEl = document.getElementById('app-dashboard-view');
    const overlay = document.getElementById('sidebar-overlay');

    if (landingEl)   landingEl.style.display   = 'none';
    if (dashboardEl) dashboardEl.style.display = 'flex';
    if (overlay)     overlay.style.display     = '';

    document.body.classList.remove('in-landing');
    document.body.classList.add('in-dashboard');

    const targetSection = PAGE_META[sectionId] ? sectionId : 'overview';
    navigateTo(targetSection);

    // Update URL hash for dashboard
    window.history.replaceState(null, '', `#${targetSection}`);

    // Trigger app refresh / chart resize when switching from landing to dashboard
    if (typeof _refreshCallback === 'function') {
        setTimeout(() => {
            _refreshCallback();
        }, 30);
    }
}

/**
 * Switch the visible section within the dashboard.
 * @param {string} sectionId - 'overview' | 'analytics' | 'transactions' | 'anomaly-insights'
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

    if (_isDashboardActive) {
        window.history.replaceState(null, '', `#${sectionId}`);
    }
}

/**
 * Returns the ID of the currently active section.
 * @returns {string}
 */
export function getCurrentSection() {
    return _currentSection;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function _handleRouteFromHash() {
    const hash = window.location.hash.toLowerCase();

    if (hash === '#dashboard' || hash === '#overview') {
        if (!isAuthenticated()) {
            showLandingPage();
        } else {
            showDashboard('overview');
        }
    } else if (hash === '#analytics') {
        if (!isAuthenticated()) {
            showLandingPage();
        } else {
            showDashboard('analytics');
        }
    } else if (hash === '#transactions') {
        if (!isAuthenticated()) {
            showLandingPage();
        } else {
            showDashboard('transactions');
        }
    } else if (hash === '#anomaly-insights' || hash === '#anomalies') {
        if (!isAuthenticated()) {
            showLandingPage();
        } else {
            showDashboard('anomaly-insights');
        }
    } else if (hash.startsWith('#features') || hash.startsWith('#how-it-works') || hash.startsWith('#why') || hash.startsWith('#pricing')) {
        showLandingPage();
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (hash === '#landing') {
        showLandingPage();
    } else {
        // Default route: route authenticated users straight to dashboard overview
        if (isAuthenticated()) {
            showDashboard('overview');
        } else {
            showLandingPage();
        }
    }
}

function _bindLandingActions() {
    const exploreIds = [
        'btn-landing-nav-explore',
        'btn-landing-open-dashboard',
        'btn-hero-explore-dashboard',
        'btn-hero-open-dashboard',
        'btn-dark-cta-explore',
        'btn-final-open-dashboard'
    ];

    exploreIds.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (isAuthenticated()) {
                    showDashboard('overview');
                } else {
                    openAuthModal({
                        tab: 'login',
                        onSuccess: () => showDashboard('overview')
                    });
                }
            });
        }
    });

    // Landing logo button
    const landingLogo = document.getElementById('landing-logo-btn');
    if (landingLogo) {
        landingLogo.addEventListener('click', (e) => {
            e.preventDefault();
            showLandingPage();
        });
    }
}

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

    // "View All Transactions" shortcuts on the Overview recent-transactions panel
    const viewAllBtn = document.getElementById('btn-view-all-transactions');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => navigateTo('transactions'));
    }

    const viewRecentMoreBtn = document.getElementById('btn-view-recent-more');
    if (viewRecentMoreBtn) {
        viewRecentMoreBtn.addEventListener('click', () => navigateTo('transactions'));
    }

    // Top Navbar Center "Home" Button → Return to Landing Page
    const navbarHomeBtn = document.getElementById('btn-navbar-home');
    if (navbarHomeBtn) {
        navbarHomeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showLandingPage();
        });
    }

    // User Profile Dropdown Toggle
    const profileBtn = document.getElementById('navbar-user-profile-btn');
    const dropdown = document.getElementById('user-profile-dropdown');

    if (profileBtn && dropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.toggle('dropdown--show');
            profileBtn.classList.toggle('active', isOpen);
            profileBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('dropdown--show');
                profileBtn.classList.remove('active');
                profileBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Dropdown Logout Button
    const navbarLogoutBtn = document.getElementById('btn-navbar-logout');
    if (navbarLogoutBtn) {
        navbarLogoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dropdown) dropdown.classList.remove('dropdown--show');
            if (profileBtn) profileBtn.classList.remove('active');
            logout();
            reloadForUser();
            resetAuthForms();
            showLandingPage();
        });
    }
}

function _bindDashboardReturnActions() {
    // Brand logo in dashboard sidebar → return to landing page
    const sidebarBrand = document.querySelector('.sidebar-brand');
    if (sidebarBrand) {
        sidebarBrand.style.cursor = 'pointer';
        sidebarBrand.title = 'Return to Home / Landing Page';
        sidebarBrand.addEventListener('click', () => showLandingPage());
    }

    // Logout button in dashboard sidebar → log out session and return to landing page
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logout();
            reloadForUser();
            resetAuthForms();
            showLandingPage();
        });
    }
}

function _closeMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('sidebar--open');
    if (overlay) overlay.classList.remove('overlay--visible');
}

