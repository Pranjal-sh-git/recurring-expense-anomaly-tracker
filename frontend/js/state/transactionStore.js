/**
 * transactionStore.js — In-Memory & MongoDB-Backed Transaction State
 *
 * The single source of truth for transactions at runtime.
 * Delegates authoritative persistence to dataService.js (MongoDB REST APIs)
 * and uses LocalStorage as a resilient cache.
 *
 * No DOM access. No analytics. No anomaly detection.
 *
 * Exports:
 *   getTransactions()                   – Array (defensive copy, synchronous)
 *   getTransactionById(id)              – Object|null (defensive copy, synchronous)
 *   addTransaction(tx)                  – Promise<Object> (added tx)
 *   updateTransaction(id, updates)      – Promise<Object> (updated tx)
 *   deleteTransaction(id)               – Promise<boolean>
 *   setTransactions(txArray)            – void (replace in-memory state)
 *   clearStore()                        – Promise<void>
 *   loadDemoData(txArray, append?)      – Promise<Array<Object>>
 *   reloadForUser()                     – Promise<Array<Object>> (fetches authoritative data from MongoDB)
 */

import {
    fetchTransactionsApi,
    createTransactionApi,
    updateTransactionApi,
    deleteTransactionApi,
    importTransactionsApi,
    loadTransactions,
    saveTransactions,
    clearTransactions
} from '../services/dataService.js';
import { validateTransaction, normalizeTransaction } from '../utils/validators.js';
import { getCurrentUser, isAuthenticated }            from '../services/authService.js';

// ─── In-memory state ──────────────────────────────────────────────────────────

let _activeUserId = getCurrentUser()?.id ?? null;
// Initialize from local cache for instant UI rendering
let transactions = loadTransactions(_activeUserId);

// ─── Private helpers ──────────────────────────────────────────────────────────

function _userId() {
    return getCurrentUser()?.id ?? null;
}

/**
 * Format date string to canonical 'YYYY-MM-DD' format.
 * @param {*} rawDate
 * @returns {string}
 */
function _canonicalDate(rawDate) {
    if (!rawDate) return '';
    if (typeof rawDate === 'string') {
        return rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.trim();
    }
    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
        return rawDate.toISOString().split('T')[0];
    }
    return String(rawDate);
}

/**
 * Normalize an API or raw transaction to match frontend structure.
 * @param {Object} tx
 * @returns {Object}
 */
function _formatTransaction(tx) {
    const rawId = tx.id || tx._id;
    const cleanId = rawId ? String(rawId) : generateId();

    return {
        id: cleanId,
        title: typeof tx.title === 'string' ? tx.title.trim() : String(tx.title || '').trim(),
        amount: Number(tx.amount) || 0,
        category: typeof tx.category === 'string' ? tx.category.trim() : String(tx.category || '').trim(),
        date: _canonicalDate(tx.date),
        recurring: Boolean(tx.recurring),
        description: typeof tx.description === 'string' ? tx.description.trim() : '',
        isAnomaly: Boolean(tx.isAnomaly),
        anomalyScore: tx.anomalyScore ?? null
    };
}

/**
 * Generate a unique fallback ID if none exists.
 * @returns {string}
 */
function generateId() {
    return (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : (Date.now().toString(36) + Math.random().toString(36).slice(2, 11));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns all transactions currently loaded in the store.
 * Synchronous method returning defensive copies to avoid direct mutations.
 * @returns {Array<Object>}
 */
export function getTransactions() {
    return transactions.map(t => ({ ...t }));
}

/**
 * Retrieve a single transaction by ID.
 * Synchronous method returning a defensive copy.
 * @param {string|number} id
 * @returns {Object|null}
 */
export function getTransactionById(id) {
    if (!id) return null;
    const tx = transactions.find(t => String(t.id) === String(id));
    return tx ? { ...tx } : null;
}

/**
 * Replace in-memory transactions without persisting to backend.
 * @param {Array<Object>} txArray
 */
export function setTransactions(txArray) {
    _activeUserId = _userId();
    transactions = Array.isArray(txArray) ? txArray.map(_formatTransaction) : [];
}

/**
 * Re-hydrate store with authoritative data from MongoDB for the authenticated user.
 * Falls back to LocalStorage cache if offline or unauthenticated.
 * @returns {Promise<Array<Object>>}
 */
export async function reloadForUser() {
    _activeUserId = _userId();

    if (isAuthenticated()) {
        try {
            const apiTransactions = await fetchTransactionsApi();
            transactions = Array.isArray(apiTransactions)
                ? apiTransactions.map(_formatTransaction)
                : [];
            // Cache locally for resilient offline support
            saveTransactions(transactions, _activeUserId);
            return getTransactions();
        } catch (error) {
            console.warn('[transactionStore] Failed to fetch from MongoDB, falling back to cache:', error);
            transactions = loadTransactions(_activeUserId).map(_formatTransaction);
            return getTransactions();
        }
    } else {
        // Unauthenticated / guest session
        transactions = loadTransactions(_activeUserId).map(_formatTransaction);
        return getTransactions();
    }
}

/**
 * Validate and add a transaction. Persists authoritatively to MongoDB if authenticated.
 * @param {Object} transaction - { title, amount, category, date, recurring, description }
 * @returns {Promise<Object>} The newly created transaction
 */
export async function addTransaction(transaction) {
    _activeUserId = _userId();

    const { isValid, errors } = validateTransaction(transaction);
    if (!isValid) {
        const msg = Object.entries(errors)
            .map(([field, err]) => `${field}: ${err}`)
            .join(', ');
        throw new Error(`Validation failed: ${msg}`);
    }

    if (isAuthenticated()) {
        try {
            const created = await createTransactionApi({
                title: transaction.title,
                amount: transaction.amount,
                category: transaction.category,
                date: _canonicalDate(transaction.date),
                recurring: transaction.recurring,
                description: transaction.description || ''
            });

            const formatted = _formatTransaction(created);
            transactions.push(formatted);
            saveTransactions(transactions, _activeUserId);
            return { ...formatted };
        } catch (apiError) {
            console.error('[transactionStore.addTransaction API Error]:', apiError);
            throw new Error(apiError.message || 'Failed to save transaction to database.');
        }
    } else {
        // Fallback for guest mode
        const normalized = normalizeTransaction({
            ...transaction,
            id: transaction.id || generateId(),
            date: _canonicalDate(transaction.date)
        });
        const formatted = _formatTransaction(normalized);
        transactions.push(formatted);
        saveTransactions(transactions, _activeUserId);
        return { ...formatted };
    }
}

/**
 * Update an existing transaction by ID.
 * Persists authoritatively to MongoDB if authenticated.
 * @param {string|number} id - Transaction ID
 * @param {Object} updates - Updated fields
 * @returns {Promise<Object>} The updated transaction
 */
export async function updateTransaction(id, updates) {
    _activeUserId = _userId();
    if (!id) {
        throw new Error('Transaction ID is required for update.');
    }

    const index = transactions.findIndex(t => String(t.id) === String(id));
    if (index === -1) {
        throw new Error(`Transaction with ID "${id}" was not found.`);
    }

    const existing = transactions[index];
    const candidate = {
        ...existing,
        ...updates,
        id: existing.id
    };

    const { isValid, errors } = validateTransaction(candidate);
    if (!isValid) {
        const msg = Object.entries(errors)
            .map(([field, err]) => `${field}: ${err}`)
            .join(', ');
        throw new Error(`Validation failed: ${msg}`);
    }

    if (isAuthenticated()) {
        try {
            const updated = await updateTransactionApi(id, {
                title: candidate.title,
                amount: candidate.amount,
                category: candidate.category,
                date: _canonicalDate(candidate.date),
                recurring: candidate.recurring,
                description: candidate.description || ''
            });

            const formatted = _formatTransaction(updated);
            transactions[index] = formatted;
            saveTransactions(transactions, _activeUserId);
            return { ...formatted };
        } catch (apiError) {
            console.error('[transactionStore.updateTransaction API Error]:', apiError);
            throw new Error(apiError.message || 'Failed to update transaction in database.');
        }
    } else {
        const formatted = _formatTransaction(candidate);
        transactions[index] = formatted;
        saveTransactions(transactions, _activeUserId);
        return { ...formatted };
    }
}

/**
 * Delete a transaction by ID.
 * Deletes from MongoDB if authenticated.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteTransaction(id) {
    _activeUserId = _userId();
    if (!id) return false;

    const index = transactions.findIndex(t => String(t.id) === String(id));
    if (index === -1) return false;

    if (isAuthenticated()) {
        try {
            await deleteTransactionApi(id);
            transactions.splice(index, 1);
            saveTransactions(transactions, _activeUserId);
            return true;
        } catch (apiError) {
            console.error('[transactionStore.deleteTransaction API Error]:', apiError);
            throw new Error(apiError.message || 'Failed to delete transaction from database.');
        }
    } else {
        transactions.splice(index, 1);
        saveTransactions(transactions, _activeUserId);
        return true;
    }
}

/**
 * Bulk import / load transactions.
 * Saves to MongoDB via importTransactionsApi when authenticated.
 * @param {Array<Object>} demoTransactions
 * @param {boolean} [append=false]
 * @returns {Promise<Array<Object>>}
 */
export async function loadDemoData(demoTransactions, append = false) {
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
            accepted.push({
                title: String(tx.title).trim(),
                amount: Number(tx.amount),
                category: String(tx.category).trim(),
                date: _canonicalDate(tx.date),
                recurring: Boolean(tx.recurring),
                description: tx.description ? String(tx.description).trim() : ''
            });
        } catch (err) {
            console.warn(`loadDemoData: skipping row -- ${err.message}`);
        }
    }

    if (accepted.length === 0) return [];

    _activeUserId = _userId();

    if (isAuthenticated()) {
        try {
            const imported = await importTransactionsApi(accepted);
            const rawList = Array.isArray(imported) ? imported : (imported?.transactions || []);
            const formattedList = rawList.map(_formatTransaction);

            if (append) {
                transactions.push(...formattedList);
            } else {
                transactions = formattedList;
            }
            saveTransactions(transactions, _activeUserId);
            return formattedList.map(t => ({ ...t }));
        } catch (error) {
            console.error('[transactionStore.loadDemoData API Error]:', error);
            throw new Error(error.message || 'Bulk import to database failed.');
        }
    } else {
        const localList = accepted.map(t => _formatTransaction({ ...t, id: generateId() }));
        if (append) {
            transactions.push(...localList);
        } else {
            transactions = localList;
        }
        saveTransactions(transactions, _activeUserId);
        return localList.map(t => ({ ...t }));
    }
}

/**
 * Clear all transactions from memory and storage.
 */
export async function clearStore() {
    _activeUserId = _userId();
    transactions = [];
    clearTransactions(_activeUserId);
    saveTransactions([], _activeUserId);
}

export default {
    getTransactions,
    getTransactionById,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setTransactions,
    clearStore,
    loadDemoData,
    reloadForUser,
};
