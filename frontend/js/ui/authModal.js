/**
 * authModal.js — Premium Glassmorphism Authentication Modal Controller
 *
 * Responsibilities:
 *   - Open/close the glassmorphic auth modal overlay with smooth spring-like animations.
 *   - Handle tab switching between [ Sign In ] and [ Create Account ] with smooth transitions.
 *   - Toggle password visibility (show/hide password).
 *   - Handle Login and Signup form validation and submission.
 *   - Render inline error messages and sleek button loading / success states.
 *   - Trigger successful dashboard navigation on authentication.
 */

import { login, signup, isAuthenticated } from '../services/authService.js';

let _onAuthSuccessCallback = null;
let _currentTab = 'login'; // 'login' | 'signup'

/**
 * Initialize the Auth Modal DOM bindings.
 * @param {Function} onAuthSuccess - Global callback when user authenticates
 */
export function initAuthModal(onAuthSuccess) {
    _onAuthSuccessCallback = onAuthSuccess;

    _bindModalControls();
    _bindTabSwitcher();
    _bindPasswordToggles();
    _bindForms();
}

/**
 * Completely reset all auth form inputs, password masks, and error messages.
 */
export function resetAuthForms() {
    const loginForm = document.getElementById('auth-login-form');
    const signupForm = document.getElementById('auth-signup-form');
    
    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();

    // Explicitly blank out all inputs to prevent browser memory holding old credentials
    const inputs = document.querySelectorAll('.auth-modal-container input:not([type="checkbox"])');
    inputs.forEach(input => {
        input.value = '';
    });

    // Reset password visibility toggles back to masked (type="password")
    const passwordToggles = document.querySelectorAll('.auth-password-toggle');
    passwordToggles.forEach(btn => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (input) input.type = 'password';
        btn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
            </svg>
        `;
        btn.title = 'Show password';
    });

    _clearErrors();
}

/**
 * Open the Auth Modal.
 * @param {object} [options]
 * @param {'login'|'signup'} [options.tab='login']
 * @param {Function} [options.onSuccess]
 */
export function openAuthModal(options = {}) {
    const backdrop = document.getElementById('auth-modal-backdrop');
    if (!backdrop) return;

    if (typeof options.onSuccess === 'function') {
        _onAuthSuccessCallback = options.onSuccess;
    }

    // Always clear inputs and errors when opening
    resetAuthForms();

    // Switch to requested tab
    switchAuthTab(options.tab || 'login');

    // Show modal with backdrop blur & spring entrance
    backdrop.classList.add('auth-modal--visible');
    document.body.style.overflow = 'hidden';

    // Auto-focus first visible input
    setTimeout(() => {
        const firstInput = document.querySelector(`.auth-form--active .auth-input`);
        if (firstInput) firstInput.focus();
    }, 150);
}

/**
 * Close the Auth Modal.
 */
export function closeAuthModal() {
    const backdrop = document.getElementById('auth-modal-backdrop');
    if (!backdrop) return;

    backdrop.classList.remove('auth-modal--visible');
    document.body.style.overflow = '';
    resetAuthForms();
}

/**
 * Switch active tab between 'login' and 'signup'.
 * @param {'login'|'signup'} tab
 */
export function switchAuthTab(tab) {
    _currentTab = tab;
    _clearErrors();

    const loginTabBtn = document.getElementById('auth-tab-login');
    const signupTabBtn = document.getElementById('auth-tab-signup');
    const loginFormView = document.getElementById('auth-view-login');
    const signupFormView = document.getElementById('auth-view-signup');

    if (tab === 'login') {
        if (loginTabBtn) loginTabBtn.classList.add('auth-tab--active');
        if (signupTabBtn) signupTabBtn.classList.remove('auth-tab--active');
        if (loginFormView) loginFormView.classList.add('auth-form--active');
        if (signupFormView) signupFormView.classList.remove('auth-form--active');
    } else {
        if (loginTabBtn) loginTabBtn.classList.remove('auth-tab--active');
        if (signupTabBtn) signupTabBtn.classList.add('auth-tab--active');
        if (loginFormView) loginFormView.classList.remove('auth-form--active');
        if (signupFormView) signupFormView.classList.add('auth-form--active');
    }
}

// ─── Private Event Handlers & Helpers ─────────────────────────────────────────

function _bindModalControls() {
    const backdrop = document.getElementById('auth-modal-backdrop');
    const closeBtn = document.getElementById('auth-modal-close-btn');

    // Close button click
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeAuthModal());
    }

    // Click outside modal container (on backdrop) to close
    if (backdrop) {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                closeAuthModal();
            }
        });
    }

    // Escape key listener
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && backdrop && backdrop.classList.contains('auth-modal--visible')) {
            closeAuthModal();
        }
    });
}

function _bindTabSwitcher() {
    const loginTabBtn = document.getElementById('auth-tab-login');
    const signupTabBtn = document.getElementById('auth-tab-signup');

    if (loginTabBtn) {
        loginTabBtn.addEventListener('click', () => switchAuthTab('login'));
    }
    if (signupTabBtn) {
        signupTabBtn.addEventListener('click', () => switchAuthTab('signup'));
    }
}

function _bindPasswordToggles() {
    const toggles = document.querySelectorAll('.auth-password-toggle');
    toggles.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetInputId = btn.dataset.target;
            const input = document.getElementById(targetInputId);
            if (!input) return;

            if (input.type === 'password') {
                input.type = 'text';
                btn.innerHTML = `
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                `;
                btn.title = 'Hide password';
            } else {
                input.type = 'password';
                btn.innerHTML = `
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                `;
                btn.title = 'Show password';
            }
        });
    });
}

function _bindForms() {
    const loginForm = document.getElementById('auth-login-form');
    const signupForm = document.getElementById('auth-signup-form');

    // ── Login Submit ──
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            _clearErrors();

            const emailInput = document.getElementById('login-email');
            const passwordInput = document.getElementById('login-password');
            const submitBtn = document.getElementById('login-submit-btn');

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            if (!email || !password) {
                _showError('login', 'Please fill in both email and password.');
                return;
            }

            // Set button loading state
            _setButtonLoading(submitBtn, 'Signing you in...');

            // Realistic micro-delay for smooth SaaS feel
            setTimeout(() => {
                const res = login(email, password);

                if (!res.success) {
                    _resetButton(submitBtn, 'Sign In to Dashboard →');
                    _showError('login', res.error || 'Invalid email or password.');
                    return;
                }

                // Show success state
                _setButtonSuccess(submitBtn, '✓ Verified!');

                setTimeout(() => {
                    closeAuthModal();
                    _resetButton(submitBtn, 'Sign In to Dashboard →');
                    if (loginForm) loginForm.reset();

                    if (typeof _onAuthSuccessCallback === 'function') {
                        _onAuthSuccessCallback();
                    }
                }, 400);
            }, 450);
        });
    }

    // ── Signup Submit ──
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            _clearErrors();

            const nameInput = document.getElementById('signup-name');
            const emailInput = document.getElementById('signup-email');
            const passwordInput = document.getElementById('signup-password');
            const confirmInput = document.getElementById('signup-confirm-password');
            const submitBtn = document.getElementById('signup-submit-btn');

            const name = nameInput ? nameInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';
            const confirm = confirmInput ? confirmInput.value : '';

            // Validation
            if (!name) {
                _showError('signup', 'Please enter your full name.');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                _showError('signup', 'Please enter a valid email address.');
                return;
            }

            if (!password || password.length < 6) {
                _showError('signup', 'Password must have at least 6 characters.');
                return;
            }

            if (password !== confirm) {
                _showError('signup', 'Passwords do not match.');
                return;
            }

            // Set button loading state
            _setButtonLoading(submitBtn, 'Creating account...');

            setTimeout(() => {
                const res = signup(name, email, password);

                if (!res.success) {
                    _resetButton(submitBtn, 'Create Account →');
                    _showError('signup', res.error || 'Registration failed. Please try again.');
                    return;
                }

                // Show success state
                _setButtonSuccess(submitBtn, '✓ Account Created!');

                setTimeout(() => {
                    closeAuthModal();
                    _resetButton(submitBtn, 'Create Account →');
                    if (signupForm) signupForm.reset();

                    if (typeof _onAuthSuccessCallback === 'function') {
                        _onAuthSuccessCallback();
                    }
                }, 400);
            }, 500);
        });
    }
}

function _showError(formType, message) {
    const errorEl = document.getElementById(`auth-${formType}-error`);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('auth-error--show');
    }
}

function _clearErrors() {
    const errorEls = document.querySelectorAll('.auth-error-alert');
    errorEls.forEach(el => {
        el.textContent = '';
        el.classList.remove('auth-error--show');
    });
}

function _setButtonLoading(btn, text) {
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = `
        <span class="auth-spinner"></span>
        <span>${text}</span>
    `;
}

function _setButtonSuccess(btn, text) {
    if (!btn) return;
    btn.disabled = true;
    btn.classList.add('auth-submit--success');
    btn.innerHTML = `<span>${text}</span>`;
}

function _resetButton(btn, originalHtml) {
    if (!btn) return;
    btn.disabled = false;
    btn.classList.remove('auth-submit--success');
    btn.innerHTML = `<span>${originalHtml}</span>`;
}
