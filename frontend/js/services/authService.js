/**
 * authService.js — Backend JWT Authentication & Session Service
 *
 * Responsibilities:
 *   - Authenticate with backend MongoDB via JWT (/api/auth/login, /api/auth/register).
 *   - Manage active session user in localStorage (`kharchaSenseCurrentUser`).
 *   - Manage auth boolean flag in localStorage (`kharchaSenseAuth`).
 *   - Delegate token persistence and header injection to apiClient.js.
 *   - Provide robust async login, signup, verifySession, and logout methods.
 *   - Provide helper for updating top navbar user info dynamically.
 */

import { getToken, setToken, removeToken, post, get } from './apiClient.js';

const STORAGE_KEY_CURRENT_USER = 'kharchaSenseCurrentUser';
const STORAGE_KEY_AUTH = 'kharchaSenseAuth';

// Legacy keys for fallback migration
const LEGACY_STORAGE_KEY_CURRENT_USER = 'expenseTrackCurrentUser';
const LEGACY_STORAGE_KEY_AUTH = 'expenseTrackAuth';

/**
 * Check if a user is currently authenticated with a valid JWT token.
 * @returns {boolean}
 */
export function isAuthenticated() {
    try {
        const token = getToken();
        const currentUser = getCurrentUser();
        const isAuth = localStorage.getItem(STORAGE_KEY_AUTH) || localStorage.getItem(LEGACY_STORAGE_KEY_AUTH);
        return Boolean(token && currentUser && currentUser.email && (isAuth === 'true' || isAuth === true));
    } catch (e) {
        return false;
    }
}

/**
 * Get the currently logged-in user object from localStorage.
 * @returns {object|null}
 */
export function getCurrentUser() {
    try {
        const data = localStorage.getItem(STORAGE_KEY_CURRENT_USER) || localStorage.getItem(LEGACY_STORAGE_KEY_CURRENT_USER);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

/**
 * Log in a user via backend JWT authentication.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ success: boolean, user?: object, error?: string }>}
 */
export async function login(email, password) {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedPassword = (password || '').trim();

    if (!trimmedEmail || !trimmedPassword) {
        return { success: false, error: 'Please enter both email and password.' };
    }

    try {
        const response = await post('/api/auth/login', {
            email: trimmedEmail,
            password: trimmedPassword
        });

        const authData = response.data || {};
        const token = authData.token;
        const user = authData.user || {};

        if (!token) {
            throw new Error('Authentication succeeded but no authorization token was received.');
        }

        // Store JWT token in apiClient / localStorage
        setToken(token);

        // Save active user profile in localStorage session
        const sessionUser = {
            id: user.id || user._id || '',
            name: user.name || 'User',
            email: user.email || trimmedEmail
        };

        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(sessionUser));
        localStorage.setItem(STORAGE_KEY_AUTH, 'true');

        updateNavbarUserDisplay();

        return { success: true, user: sessionUser };
    } catch (error) {
        console.error('[authService.login error]:', error);
        return {
            success: false,
            error: error.message || 'Invalid email or password.'
        };
    }
}

/**
 * Sign up a new user via backend JWT authentication.
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ success: boolean, user?: object, error?: string }>}
 */
export async function signup(name, email, password) {
    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedPassword = (password || '').trim();

    if (!trimmedName) {
        return { success: false, error: 'Please enter your full name.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!trimmedPassword || trimmedPassword.length < 6) {
        return { success: false, error: 'Password must have at least 6 characters.' };
    }

    try {
        const response = await post('/api/auth/register', {
            name: trimmedName,
            email: trimmedEmail,
            password: trimmedPassword
        });

        const authData = response.data || {};
        const token = authData.token;
        const user = authData.user || {};

        if (!token) {
            throw new Error('Registration succeeded but no authorization token was received.');
        }

        // Store JWT token
        setToken(token);

        // Save active session
        const sessionUser = {
            id: user.id || user._id || '',
            name: user.name || trimmedName,
            email: user.email || trimmedEmail
        };

        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(sessionUser));
        localStorage.setItem(STORAGE_KEY_AUTH, 'true');

        updateNavbarUserDisplay();

        return { success: true, user: sessionUser };
    } catch (error) {
        console.error('[authService.signup error]:', error);
        return {
            success: false,
            error: error.message || 'Registration failed. Please try again.'
        };
    }
}

/**
 * Verify current session with backend /api/auth/me.
 * Refreshes user details if valid; clears session if token expired or invalid.
 * @returns {Promise<object|null>}
 */
export async function verifySession() {
    const token = getToken();
    if (!token) {
        logout();
        return null;
    }

    try {
        const response = await get('/api/auth/me');
        const user = response?.data?.user;
        if (user) {
            const sessionUser = {
                id: user.id || user._id || '',
                name: user.name,
                email: user.email
            };
            localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(sessionUser));
            localStorage.setItem(STORAGE_KEY_AUTH, 'true');
            updateNavbarUserDisplay();
            return sessionUser;
        }
        return getCurrentUser();
    } catch (error) {
        // If 401 Unauthorized, token has expired or is invalid
        if (error.status === 401) {
            console.warn('[authService] Session expired. Logging out.');
            logout();
        }
        return null;
    }
}

/**
 * Log out the current user.
 * Clears JWT token and auth session flags without deleting application data.
 */
export function logout() {
    removeToken();
    try {
        localStorage.removeItem(STORAGE_KEY_AUTH);
        localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
        localStorage.removeItem(LEGACY_STORAGE_KEY_AUTH);
        localStorage.removeItem(LEGACY_STORAGE_KEY_CURRENT_USER);
    } catch (e) {
        console.warn('[authService] Error clearing auth storage:', e);
    }
    updateNavbarUserDisplay();
}

/**
 * Dynamically update the top navbar user greeting, avatar, and name.
 */
export function updateNavbarUserDisplay() {
    const user = getCurrentUser();
    const nameEl = document.getElementById('navbar-user-name');
    const greetingEl = document.getElementById('navbar-user-greeting');
    const dropdownNameEl = document.getElementById('dropdown-user-name');
    const dropdownEmailEl = document.getElementById('dropdown-user-email');

    const displayName = user && user.name ? user.name : 'Account';
    const displayEmail = user && user.email ? user.email : 'Sign in to access data';

    if (nameEl) {
        nameEl.textContent = displayName;
    }
    if (dropdownNameEl) {
        dropdownNameEl.textContent = displayName;
    }
    if (dropdownEmailEl) {
        dropdownEmailEl.textContent = displayEmail;
    }

    if (greetingEl) {
        const hour = new Date().getHours();
        let greeting = 'Good Morning 👋';
        if (hour >= 12 && hour < 17) {
            greeting = 'Good Afternoon ☀️';
        } else if (hour >= 17) {
            greeting = 'Good Evening 🌙';
        }
        greetingEl.textContent = greeting;
    }
}

export default {
    isAuthenticated,
    getCurrentUser,
    login,
    signup,
    logout,
    verifySession,
    updateNavbarUserDisplay
};
