/**
 * validators.js
 * Reusable, pure validation and normalization functions for transaction data.
 * No DOM access. No side effects.
 *
 * Exports:
 *   validateTitle(title)             – boolean
 *   validateAmount(amount)           – boolean
 *   validateCategory(category)       – boolean
 *   validateDate(date)               – boolean
 *   validateTransaction(tx)          – { isValid, errors }
 *   normalizeTransaction(tx)         – clean transaction object (new copy, no mutation)
 */

// ─── Individual field validators ─────────────────────────────────────────────

/**
 * Checks if a title is a non-empty string.
 * @param {*} title
 * @returns {boolean}
 */
export function validateTitle(title) {
    return typeof title === 'string' && title.trim().length > 0;
}

/**
 * Checks if an amount is a valid positive finite number greater than zero.
 * Accepts numeric strings (e.g. "12.50").
 * @param {*} amount
 * @returns {boolean}
 */
export function validateAmount(amount) {
    if (amount === null || amount === undefined || typeof amount === 'symbol') {
        return false;
    }
    const num = Number(amount);
    return !isNaN(num) && num > 0 && isFinite(num);
}

/**
 * Checks if a category is a non-empty string.
 * @param {*} category
 * @returns {boolean}
 */
export function validateCategory(category) {
    return typeof category === 'string' && category.trim().length > 0;
}

/**
 * Checks if a date value is non-empty and resolves to a valid timestamp.
 * Accepts YYYY-MM-DD strings, ISO strings, or Date objects.
 * @param {*} date
 * @returns {boolean}
 */
export function validateDate(date) {
    if (!date) return false;
    if (date instanceof Date) return !isNaN(date.getTime());
    const timestamp = Date.parse(date);
    return !isNaN(timestamp);
}

// ─── Composite validator ──────────────────────────────────────────────────────

/**
 * Validates a complete transaction object against all field rules.
 * @param {Object} transaction
 * @returns {{ isValid: boolean, errors: Object.<string, string> }}
 */
export function validateTransaction(transaction) {
    if (!transaction || typeof transaction !== 'object' || Array.isArray(transaction)) {
        return {
            isValid: false,
            errors: { general: 'Transaction must be a valid object.' }
        };
    }

    const errors = {};

    if (!validateTitle(transaction.title)) {
        errors.title = 'Title must not be empty.';
    }
    if (!validateAmount(transaction.amount)) {
        errors.amount = 'Amount must be a valid positive number greater than zero.';
    }
    if (!validateCategory(transaction.category)) {
        errors.category = 'Category must not be empty.';
    }
    if (!validateDate(transaction.date)) {
        errors.date = 'Date must be a valid, non-empty date.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

/**
 * Returns a new, normalized transaction object from raw input.
 * Does NOT mutate the original object.
 * Does NOT validate — call validateTransaction() first if needed.
 *
 * Normalization rules:
 *   - title      → trimmed string
 *   - amount     → positive finite number (Number())
 *   - category   → trimmed string
 *   - date       → stored as-is (YYYY-MM-DD strings are preferred)
 *   - recurring  → coerced to boolean (default false)
 *   - id         → kept if truthy, otherwise a new UUID/fallback is generated
 *
 * @param {Object} transaction - Raw transaction data.
 * @returns {Object} A clean, normalized transaction object.
 */
export function normalizeTransaction(transaction) {
    if (!transaction || typeof transaction !== 'object') {
        throw new TypeError('normalizeTransaction: input must be an object.');
    }

    // Generate a unique ID if none is provided
    const id = transaction.id
        || (typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : (Date.now().toString(36) + Math.random().toString(36).slice(2, 11)));

    return {
        id,
        title:     typeof transaction.title    === 'string' ? transaction.title.trim()    : String(transaction.title ?? '').trim(),
        amount:    Number(transaction.amount),
        category:  typeof transaction.category === 'string' ? transaction.category.trim() : String(transaction.category ?? '').trim(),
        date:      transaction.date ?? '',
        recurring: Boolean(transaction.recurring),
    };
}

// ─── Default export (convenience object) ─────────────────────────────────────

export default {
    validateTitle,
    validateAmount,
    validateCategory,
    validateDate,
    validateTransaction,
    normalizeTransaction,
};
