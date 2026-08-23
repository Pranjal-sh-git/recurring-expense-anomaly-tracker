/**
 * dataService.js — Persistence Layer
 *
 * Responsible for:
 *   - Saving/loading transactions to/from LocalStorage.
 *   - Clearing persisted data.
 *   - Parsing CSV text into validated, normalized transaction arrays.
 *
 * No DOM access. No analytics. No anomaly detection.
 *
 * Exports:
 *   loadTransactions()             – Array of raw transaction objects
 *   saveTransactions(txArray)      – boolean (success flag)
 *   clearTransactions()            – boolean (success flag)
 *   parseCSV(csvText, options)     – { transactions, skipped }
 */

import { validateTransaction, normalizeTransaction } from '../utils/validators.js';
import { getCurrentUser }                             from './authService.js';

// ─── Storage key ──────────────────────────────────────────────────────────────

/** @param {string|null} [userId] */
function storageKey(userId) {
    const activeId = userId || getCurrentUser()?.id || null;
    return activeId
        ? `kharchasense_transactions_${activeId}`
        : 'kharchasense_transactions_guest';
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

/**
 * Returns true if LocalStorage is available in this environment.
 * @returns {boolean}
 */
function isLocalStorageAvailable() {
    if (typeof localStorage === 'undefined') {
        console.warn('dataService: localStorage is not available in this environment.');
        return false;
    }
    return true;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load all saved transactions from LocalStorage for the given user.
 * Returns an empty array if nothing is stored or the data is corrupted.
 * @param {string|null} [userId]
 * @returns {Array<Object>}
 */
export function loadTransactions(userId) {
    if (!isLocalStorageAvailable()) return [];
    try {
        const activeId = userId || getCurrentUser()?.id || null;
        const key = storageKey(activeId);
        let raw = localStorage.getItem(key);

        // Check legacy storage keys if new key is empty
        if (!raw) {
            const legacyKey = activeId ? `expense_tracker_transactions_${activeId}` : 'expense_tracker_transactions_guest';
            raw = localStorage.getItem(legacyKey);
            if (!raw && activeId === 'user_demo_001') {
                raw = localStorage.getItem('expense_tracker_transactions');
            }
            if (raw) {
                try {
                    localStorage.setItem(key, raw);
                } catch (e) {
                    console.warn('Could not migrate transaction data:', e);
                }
            }
        }

        if (!raw) return [];
        const parsed = JSON.parse(raw);
        // Guard against stored non-array values
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('dataService.loadTransactions: failed to parse stored data.', error);
        return [];
    }
}

/**
 * Persist an array of transactions to LocalStorage for the given user.
 * @param {Array<Object>} transactions
 * @param {string|null} [userId]
 * @returns {boolean} True if saved successfully, false on error.
 */
export function saveTransactions(transactions, userId) {
    if (!isLocalStorageAvailable()) return false;
    try {
        const list = Array.isArray(transactions) ? transactions : [];
        const key = storageKey(userId);
        localStorage.setItem(key, JSON.stringify(list));
        return true;
    } catch (error) {
        console.error('dataService.saveTransactions: failed to persist data.', error);
        return false;
    }
}

/**
 * Remove all persisted transaction data from LocalStorage for the given user.
 * @param {string|null} [userId]
 * @returns {boolean} True if cleared successfully, false on error.
 */
export function clearTransactions(userId) {
    if (!isLocalStorageAvailable()) return false;
    try {
        const key = storageKey(userId);
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('dataService.clearTransactions: failed to clear data.', error);
        return false;
    }
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

/**
 * Parse CSV text into an array of validated, normalized transaction objects.
 *
 * Supported column names (case-insensitive):
 *   title, amount, category, date, recurring
 *
 * Invalid rows are skipped; information about skipped rows is returned alongside
 * the valid transactions so the caller can surface it to the user if needed.
 *
 * @param {string} csvText - Raw CSV content (first row must be a header).
 * @param {Object} [options]
 * @param {string} [options.delimiter=','] - Column delimiter character.
 * @returns {{ transactions: Array<Object>, skipped: Array<{ row: number, reason: string }> }}
 */
export function parseCSV(csvText, { delimiter = ',' } = {}) {
    const result = { transactions: [], skipped: [] };

    if (typeof csvText !== 'string' || csvText.trim() === '') {
        return result;
    }

    // Split into lines; handle both \r\n and \n line endings
    const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length < 2) return result; // No data rows

    // ── Parse header ──
    const headerLine = lines[0];
    const headers = splitCSVLine(headerLine, delimiter).map(h => h.toLowerCase().trim());

    const colIndex = {
        title:     headers.indexOf('title'),
        amount:    headers.indexOf('amount'),
        category:  headers.indexOf('category'),
        date:      headers.indexOf('date'),
        recurring: headers.indexOf('recurring'),
    };

    // Require at minimum title, amount, category, date
    const requiredCols = ['title', 'amount', 'category', 'date'];
    const missingCols = requiredCols.filter(col => colIndex[col] === -1);
    if (missingCols.length > 0) {
        console.warn(`dataService.parseCSV: missing required column(s): ${missingCols.join(', ')}`);
        // Still attempt parsing — missing columns will produce empty strings / 0
    }

    // ── Parse data rows ──
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // skip blank lines

        const rowNumber = i + 1; // 1-indexed, header = row 1
        const cells = splitCSVLine(line, delimiter);

        const raw = {
            title:     colIndex.title     >= 0 ? cells[colIndex.title]?.trim()    ?? '' : '',
            amount:    colIndex.amount    >= 0 ? cells[colIndex.amount]?.trim()   ?? '' : '',
            category:  colIndex.category  >= 0 ? cells[colIndex.category]?.trim() ?? '' : '',
            date:      colIndex.date      >= 0 ? cells[colIndex.date]?.trim()     ?? '' : '',
            recurring: colIndex.recurring >= 0 ? cells[colIndex.recurring]?.trim().toLowerCase() : 'false',
        };

        // Coerce recurring to boolean before validation
        const recurringBool = raw.recurring === 'true' || raw.recurring === '1' || raw.recurring === 'yes';

        const candidate = {
            title:     raw.title,
            amount:    raw.amount,         // still a string; validateAmount handles numeric strings
            category:  raw.category,
            date:      raw.date,
            recurring: recurringBool,
        };

        const { isValid, errors } = validateTransaction(candidate);
        if (!isValid) {
            const reason = Object.values(errors).join('; ');
            result.skipped.push({ row: rowNumber, reason });
            continue;
        }

        try {
            result.transactions.push(normalizeTransaction(candidate));
        } catch (err) {
            result.skipped.push({ row: rowNumber, reason: err.message });
        }
    }

    return result;
}

/**
 * Split a single CSV line into fields, respecting double-quoted values.
 * @param {string} line - A single CSV row string.
 * @param {string} delimiter - The delimiter character.
 * @returns {string[]}
 */
function splitCSVLine(line, delimiter) {
    const fields = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (insideQuotes && line[i + 1] === '"') {
                // Escaped double-quote inside a quoted field
                current += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === delimiter && !insideQuotes) {
            fields.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    fields.push(current); // push the last field
    return fields;
}

// ─── Default export ───────────────────────────────────────────────────────────

export default {
    loadTransactions,
    saveTransactions,
    clearTransactions,
    parseCSV,
};
