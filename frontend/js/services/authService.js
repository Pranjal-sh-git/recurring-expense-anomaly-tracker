/**
 * authService.js — LocalStorage Authentication & Session Service
 *
 * Responsibilities:
 *   - Manage registered users array in localStorage (`expenseTrackUsers`).
 *   - Manage active session user in localStorage (`expenseTrackCurrentUser`).
 *   - Manage auth boolean flag in localStorage (`expenseTrackAuth`).
 *   - Provide robust login, signup, and logout methods.
 *   - Provide helper for updating top navbar user info dynamically.
 *   - Seed a demo account on first run so existing users can test immediately.
 */

const STORAGE_KEY_USERS = 'expenseTrackUsers';
const STORAGE_KEY_CURRENT_USER = 'expenseTrackCurrentUser';
const STORAGE_KEY_AUTH = 'expenseTrackAuth';

// Default demo account to ensure instant access if no users exist
const DEFAULT_DEMO_USER = {
    id: 'user_demo_001',
    name: 'Alex',
    email: 'test@expensetrack.app',
    password: 'password123'
};

/**
 * Get all registered users from localStorage.
 * @returns {Array<object>}
 */
export function getUsers() {
    try {
        const data = localStorage.getItem(STORAGE_KEY_USERS);
        if (!data) {
            // Seed initial demo user
            const initial = [DEFAULT_DEMO_USER];
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(initial));
            return initial;
        }
        const users = JSON.parse(data) || [];
        // Ensure test@expensetrack.app demo user is present
        const hasDemo = users.some(u => u.email.toLowerCase() === 'test@expensetrack.app');
        if (!hasDemo) {
            const legacyDemo = users.find(u => u.id === 'user_demo_001' || u.email.toLowerCase() === 'pranjal@expensetrack.app');
            if (legacyDemo) {
                legacyDemo.email = 'test@expensetrack.app';
                legacyDemo.name = 'Alex';
            } else {
                users.unshift(DEFAULT_DEMO_USER);
            }
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
        }
        return users;
    } catch (e) {
        console.error('Error reading users from localStorage:', e);
        return [DEFAULT_DEMO_USER];
    }
}

/**
 * Check if a user is currently authenticated.
 * @returns {boolean}
 */
export function isAuthenticated() {
    try {
        const isAuth = localStorage.getItem(STORAGE_KEY_AUTH);
        const currentUser = getCurrentUser();
        return (isAuth === 'true' || isAuth === true) && Boolean(currentUser && currentUser.email);
    } catch (e) {
        return false;
    }
}

/**
 * Get the currently logged-in user object.
 * @returns {object|null}
 */
export function getCurrentUser() {
    try {
        const data = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

/**
 * Log in a user with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {{ success: boolean, user?: object, error?: string }}
 */
export function login(email, password) {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedPassword = (password || '').trim();

    if (!trimmedEmail || !trimmedPassword) {
        return { success: false, error: 'Please enter both email and password.' };
    }

    const users = getUsers();
    const matchedUser = users.find(
        u => u.email.toLowerCase() === trimmedEmail && u.password === trimmedPassword
    );

    if (!matchedUser) {
        return { success: false, error: 'Invalid email or password.' };
    }

    // Save session
    const sessionUser = {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email
    };

    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(sessionUser));
    localStorage.setItem(STORAGE_KEY_AUTH, 'true');

    updateNavbarUserDisplay();

    return { success: true, user: sessionUser };
}

/**
 * Sign up a new user.
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {{ success: boolean, user?: object, error?: string }}
 */
export function signup(name, email, password) {
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

    const users = getUsers();
    const emailExists = users.some(u => u.email.toLowerCase() === trimmedEmail);

    if (emailExists) {
        return { success: false, error: 'An account with this email already exists.' };
    }

    // Create user
    const newUser = {
        id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        name: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword
    };

    users.push(newUser);
    try {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (e) {
        return { success: false, error: 'Storage error while saving user. Please try again.' };
    }

    // Save active session
    const sessionUser = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
    };

    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(sessionUser));
    localStorage.setItem(STORAGE_KEY_AUTH, 'true');

    updateNavbarUserDisplay();

    return { success: true, user: sessionUser };
}

/**
 * Log out the current user.
 * Note: Does NOT delete expense transactions or other application data!
 */
export function logout() {
    localStorage.removeItem(STORAGE_KEY_AUTH);
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
}

/**
 * Dynamically update the top navbar user greeting and name.
 */
export function updateNavbarUserDisplay() {
    const user = getCurrentUser();
    const nameEl = document.getElementById('navbar-user-name');
    const greetingEl = document.getElementById('navbar-user-greeting');
    const dropdownNameEl = document.getElementById('dropdown-user-name');
    const dropdownEmailEl = document.getElementById('dropdown-user-email');

    const displayName = user && user.name ? user.name : 'Alex';
    const displayEmail = user && user.email ? user.email : 'test@expensetrack.app';

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
