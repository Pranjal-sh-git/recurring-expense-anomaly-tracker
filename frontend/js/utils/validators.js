/**
 * Checks if a title is a non-empty string.
 * @param {*} title 
 * @returns {boolean}
 */
export function validateTitle(title) {
    return typeof title === 'string' && title.trim().length > 0;
}

/**
 * Checks if an amount is a valid positive number.
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
 * Checks if a date is valid.
 * A date is valid if it is not empty and resolves to a valid timestamp.
 * @param {*} date 
 * @returns {boolean}
 */
export function validateDate(date) {
    if (!date) {
        return false;
    }
    const timestamp = Date.parse(date);
    return !isNaN(timestamp);
}

/**
 * Validates a complete transaction object.
 * @param {Object} transaction 
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export function validateTransaction(transaction) {
    const errors = {};

    if (!transaction || typeof transaction !== 'object') {
        return {
            isValid: false,
            errors: { general: 'Transaction must be a valid object.' }
        };
    }

    if (!validateTitle(transaction.title)) {
        errors.title = 'Title must not be empty.';
    }

    if (!validateAmount(transaction.amount)) {
        errors.amount = 'Amount must be a valid positive number.';
    }

    if (!validateCategory(transaction.category)) {
        errors.category = 'Category must not be empty.';
    }

    if (!validateDate(transaction.date)) {
        errors.date = 'Date must be a valid date.';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}
