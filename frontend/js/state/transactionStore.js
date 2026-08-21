import { loadTransactions, saveTransactions } from '../services/dataService.js';
import { validateTransaction } from '../utils/validators.js';

// In-memory array of transactions
let transactions = [];

// Initialize transactions from LocalStorage
try {
    transactions = loadTransactions();
} catch (error) {
    console.error('Failed to initialize transactions in store:', error);
    transactions = [];
}

/**
 * Returns all transactions in the store.
 * Returns a shallow copy of the array to prevent direct external mutations.
 * @returns {Array} Array of transaction objects.
 */
export function getTransactions() {
    return [...transactions];
}

/**
 * Adds a transaction to the store and persists it to LocalStorage.
 * @param {Object} transaction - The transaction object to add.
 * @returns {Object} The added transaction with generated ID.
 * @throws {Error} If validation fails.
 */
export function addTransaction(transaction) {
    const validation = validateTransaction(transaction);
    if (!validation.isValid) {
        const errorMsg = Object.entries(validation.errors)
            .map(([key, msg]) => `${key}: ${msg}`)
            .join(', ');
        throw new Error(`Validation failed: ${errorMsg}`);
    }

    // Build transaction object with unique ID
    const newTransaction = {
        id: transaction.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substr(2, 9))),
        title: transaction.title.trim(),
        amount: Number(transaction.amount),
        category: transaction.category.trim(),
        date: transaction.date
    };

    transactions.push(newTransaction);
    saveTransactions(transactions);
    return newTransaction;
}

/**
 * Deletes a transaction from the store and persists changes.
 * @param {string} id - The ID of the transaction to delete.
 * @returns {boolean} True if deleted, false if transaction not found.
 */
export function deleteTransaction(id) {
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) {
        return false;
    }

    transactions.splice(index, 1);
    saveTransactions(transactions);
    return true;
}

/**
 * Clears all transactions in-memory and in LocalStorage.
 * Mainly used for testing and resetting the application state.
 */
export function clearStore() {
    transactions = [];
    saveTransactions(transactions);
}
