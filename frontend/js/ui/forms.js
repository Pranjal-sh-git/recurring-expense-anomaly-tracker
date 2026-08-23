/**
 * Forms UI Module
 * Handles rendering the transaction entry form and exposes
 * reusable helper functions for reading and resetting form values.
 *
 * Exports:
 *   initForm()             - Renders the form HTML into #transaction-form-container.
 *   getFormValues()        - Returns the current field values as a plain object.
 *   resetForm()            - Clears / resets all form fields and hides feedback.
 *   showFormError(msg)     - Displays an inline validation error.
 *   showFormSuccess(msg)   - Displays an inline success message (auto-hides after 3 s).
 */

/**
 * Render the transaction entry form into its container.
 * Attaches a submit listener that prevents default browser behaviour.
 * Actual data persistence and validation are handled by app.js via getFormValues().
 */
export function initForm() {
    console.log('Forms UI Module initialized.');

    const container = document.getElementById('transaction-form-container');
    if (!container) return;

    container.innerHTML = `
        <form class="transaction-form" id="expense-form" novalidate>

            <div class="form-group">
                <label for="tx-title">Title / Merchant</label>
                <input
                    type="text"
                    id="tx-title"
                    name="title"
                    class="form-control"
                    placeholder="e.g. Netflix Subscription"
                    required
                >
            </div>

            <div class="form-group">
                <label for="tx-amount">Amount (₹)</label>
                <input
                    type="number"
                    id="tx-amount"
                    name="amount"
                    class="form-control"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                >
            </div>

            <div class="form-group">
                <label for="tx-category">Category</label>
                <select id="tx-category" name="category" class="form-control" required>
                    <option value="" disabled selected>Select category...</option>
                    <option value="Subscriptions">Subscriptions</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Rent">Rent</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Dining">Dining</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Transport">Transport</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            <div class="form-group">
                <label for="tx-date">Date</label>
                <input
                    type="date"
                    id="tx-date"
                    name="date"
                    class="form-control"
                    required
                >
            </div>

            <div class="form-group form-group--inline">
                <input type="checkbox" id="tx-recurring" name="recurring">
                <label for="tx-recurring">Recurring Expense</label>
            </div>

            <!-- Validation / feedback messages -->
            <p class="form-error" id="form-error" role="alert" aria-live="polite"></p>
            <p class="form-success-msg" id="form-success" role="status" aria-live="polite"></p>

            <button type="submit" class="btn-submit" id="btn-add-transaction">Add Transaction</button>
        </form>
    `;
}

/**
 * Read the current values from the transaction form.
 * @returns {{ title: string, amount: number, category: string, date: string, recurring: boolean } | null}
 *   Returns null if the form is not found in the DOM.
 */
export function getFormValues() {
    const titleEl    = document.getElementById('tx-title');
    const amountEl   = document.getElementById('tx-amount');
    const categoryEl = document.getElementById('tx-category');
    const dateEl     = document.getElementById('tx-date');
    const recurringEl = document.getElementById('tx-recurring');

    if (!titleEl || !amountEl || !categoryEl || !dateEl) {
        console.warn('getFormValues: one or more form fields not found in DOM.');
        return null;
    }

    return {
        title:     titleEl.value.trim(),
        amount:    parseFloat(amountEl.value) || 0,
        category:  categoryEl.value,
        date:      dateEl.value,
        recurring: recurringEl ? recurringEl.checked : false,
    };
}

// ─── Internal timer for success feedback ───────────────────────────────────────
let successTimer = null;

/**
 * Clear and reset all transaction form fields to their default state.
 * Also hides any visible validation error or success message.
 */
export function resetForm() {
    const form = document.getElementById('expense-form');
    if (form) {
        form.reset();
    }

    if (successTimer) {
        clearTimeout(successTimer);
        successTimer = null;
    }

    // Hide both feedback banners
    const errorEl = document.getElementById('form-error');
    if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
    }

    const successEl = document.getElementById('form-success');
    if (successEl) {
        successEl.style.display = 'none';
        successEl.textContent = '';
    }
}

/**
 * Show a validation error message inside the form.
 * Also dismisses any active success message.
 * @param {string} message - The error text to display.
 */
export function showFormError(message) {
    if (successTimer) {
        clearTimeout(successTimer);
        successTimer = null;
    }

    // Dismiss success first
    const successEl = document.getElementById('form-success');
    if (successEl) {
        successEl.style.display = 'none';
        successEl.textContent = '';
    }

    const errorEl = document.getElementById('form-error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

/**
 * Show a success message inside the form.
 * Auto-hides after 3 seconds. Also dismisses any active error message.
 * @param {string} message - The success text to display.
 */
export function showFormSuccess(message) {
    if (successTimer) {
        clearTimeout(successTimer);
        successTimer = null;
    }

    // Dismiss error first
    const errorEl = document.getElementById('form-error');
    if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
    }

    const successEl = document.getElementById('form-success');
    if (successEl) {
        successEl.textContent = message;
        successEl.style.display = 'block';

        // Auto-hide after 3 s
        successTimer = setTimeout(() => {
            successEl.style.display = 'none';
            successEl.textContent = '';
            successTimer = null;
        }, 3000);
    }
}

