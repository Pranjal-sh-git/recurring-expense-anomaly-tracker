const STORAGE_KEY = 'expense_tracker_transactions';

/**
 * Loads transactions from LocalStorage.
 * @returns {Array} Array of transactions, or empty array if none exist/error.
 */
export function loadTransactions() {
    try {
        if (typeof localStorage === 'undefined') {
            console.warn('localStorage is not defined in this environment.');
            return [];
        }
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Failed to load transactions from localStorage:', error);
        return [];
    }
}

/**
 * Saves transactions to LocalStorage.
 * @param {Array} transactions 
 * @returns {boolean} True if successful, false otherwise.
 */
export function saveTransactions(transactions) {
    try {
        if (typeof localStorage === 'undefined') {
            console.warn('localStorage is not defined in this environment.');
            return false;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        return true;
    } catch (error) {
        console.error('Failed to save transactions to localStorage:', error);
        return false;
    }
}
