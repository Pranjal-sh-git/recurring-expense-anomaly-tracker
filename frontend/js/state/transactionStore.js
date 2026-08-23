/**
 * transactionStore.js — In-Memory Transaction State
 *
 * The single source of truth for transactions at runtime.
 * Delegates persistence to dataService.js and validation/normalization to validators.js.
 *
 * No DOM access. No analytics. No anomaly detection.
 *
 * Exports:
 *   getTransactions()                   – Array (defensive copy)
 *   addTransaction(tx)                  – Object (added tx) | throws on validation failure
 *   deleteTransaction(id)               – boolean
 *   setTransactions(txArray)            – void  (replace in-memory state; does NOT persist)
 *   clearStore()                        – void  (clears memory + LocalStorage)
 *   loadDemoData(txArray, append?)      – Array of loaded transactions (skips invalid rows)
 *   reloadForUser()                     – void  (re-hydrates from the current user's storage key)
 */

import { loadTransactions, saveTransactions, clearTransactions } from '../services/dataService.js';
import { validateTransaction, normalizeTransaction }             from '../utils/validators.js';
import { getCurrentUser }                                        from '../services/authService.js';

// ─── In-memory state ──────────────────────────────────────────────────────────

let _activeUserId = getCurrentUser()?.id ?? null;
let transactions = loadTransactions(_activeUserId);

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Get the active user's ID for scoping localStorage operations.
 * @returns {string|null}
 */
function _userId() {
    return getCurrentUser()?.id ?? null;
}

/**
 * Ensures in-memory transactions match the currently authenticated user.
 */
function _ensureUserSync() {
    const currentId = _userId();
    if (_activeUserId !== currentId) {
        _activeUserId = currentId;
        transactions = loadTransactions(currentId);
    }
}

/**
 * Generate a unique transaction ID.
 * @returns {string}
 */
function generateId() {
    return (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : (Date.now().toString(36) + Math.random().toString(36).slice(2, 11));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns all transactions in the store.
 * Returns a shallow copy of the array and a spread copy of each object
 * to prevent callers from directly mutating store state.
 * @returns {Array<Object>}
 */
export function getTransactions() {
    _ensureUserSync();
    return transactions.map(t => ({ ...t }));
}

/**
 * Re-hydrate the in-memory store from the current user's LocalStorage key.
 * Call this immediately after login or account switch to load the correct data.
 */
export function reloadForUser() {
    _activeUserId = _userId();
    transactions = loadTransactions(_activeUserId);
}

/**
 * Validate, normalize, persist, and add a single transaction to the store.
 *
 * @param {Object} transaction - Raw transaction data from the form or another source.
 * @returns {Object} The normalized, stored transaction (new copy).
 * @throws {Error} If validation fails.
 */
export function addTransaction(transaction) {
    _ensureUserSync();
    const { isValid, errors } = validateTransaction(transaction);
    if (!isValid) {
        const msg = Object.entries(errors)
            .map(([field, err]) => `${field}: ${err}`)
            .join(', ');
        throw new Error(`Validation failed: ${msg}`);
    }

    // normalizeTransaction returns a clean copy with all fields including `recurring`
    const normalized = normalizeTransaction({
        ...transaction,
        // Preserve any existing id; normalizeTransaction generates one if absent
        id: transaction.id || generateId(),
    });

    transactions.push(normalized);
    saveTransactions(transactions, _userId());
    return { ...normalized };
}

/**
 * Delete a transaction by ID.
 * @param {string} id - The transaction's unique ID.
 * @returns {boolean} True if found and deleted, false if not found.
 */
export function deleteTransaction(id) {
    _ensureUserSync();
    if (!id) return false;
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return false;

    transactions.splice(index, 1);
    saveTransactions(transactions, _userId());
    return true;
}

/**
 * Replace the in-memory transaction list without persisting.
 * Used by the init flow: load from LocalStorage => setTransactions => getTransactions.
 *
 * @param {Array<Object>} txArray - The replacement array.
 */
export function setTransactions(txArray) {
    _activeUserId = _userId();
    transactions = Array.isArray(txArray) ? txArray.map(t => ({ ...t })) : [];
}

/**
 * Clear all transactions from memory and LocalStorage for the current user.
 */
export function clearStore() {
    _activeUserId = _userId();
    transactions = [];
    clearTransactions(_activeUserId);    // delegates to dataService
    saveTransactions([], _activeUserId); // belt-and-suspenders: ensure key is set to []
}

/**
 * Load an array of transactions into the store in bulk.
 * Invalid rows are SKIPPED (not thrown) so a single bad record never aborts a batch import.
 * Optionally append to the existing list; otherwise replaces it.
 *
 * @param {Array<Object>} demoTransactions - Transactions to load.
 * @param {boolean} [append=false] - If true, appends; otherwise replaces.
 * @returns {Array<Object>} The successfully loaded transactions (copies).
 */
export function loadDemoData(demoTransactions, append = false) {
    if (!Array.isArray(demoTransactions)) {
        throw new TypeError('loadDemoData: first argument must be an array.');
    }

    const accepted = [];

    for (const tx of demoTransactions) {
        const { isValid, errors } = validateTransaction(tx);
        if (!isValid) {
            const reason = Object.entries(errors).map(([f, e]) => `${f}: ${e}`).join(', ');
            console.warn(`loadDemoData: skipping "${tx?.title ?? 'Untitled'}" -- ${reason}`);
            continue;
        }

        try {
            accepted.push(normalizeTransaction({
                ...tx,
                id: tx.id || generateId(),
            }));
        } catch (err) {
            console.warn(`loadDemoData: skipping row -- ${err.message}`);
        }
    }

    if (append) {
        transactions.push(...accepted);
    } else {
        transactions = accepted;
    }

    saveTransactions(transactions, _userId());
    return accepted.map(t => ({ ...t }));
}

// ─── Default export ───────────────────────────────────────────────────────────

export default {
    getTransactions,
    addTransaction,
    deleteTransaction,
    setTransactions,
    clearStore,
    loadDemoData,
    reloadForUser,
};
