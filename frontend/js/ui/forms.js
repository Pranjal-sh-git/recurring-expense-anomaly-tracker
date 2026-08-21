/**
 * Forms UI Module
 * Handles rendering the transaction entry form and exposes
 * reusable helper functions for reading and resetting form values.
 *
 * Exports:
 *   initForm()       - Renders the form HTML into #transaction-form-container.
 *   getFormValues()  - Returns the current field values as a plain object.
 *   resetForm()      - Clears / resets all form fields.
 */

/**
 * Render the transaction entry form into its container.
 * Attaches a submit listener that prevents default browser behaviour.
 * Actual data persistence is handled by the caller via getFormValues().
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
                <label for="tx-amount">Amount ($)</label>
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

            <div class="form-group" style="flex-direction: row; gap: 0.5rem; align-items: center; margin: 0.25rem 0;">
                <input type="checkbox" id="tx-recurring" name="recurring">
                <label for="tx-recurring">Recurring Expense</label>
            </div>

            <p class="form-error" id="form-error" style="display:none; color: var(--danger); font-size: 0.85rem; margin-top: 0.25rem;"></p>

            <button type="submit" class="btn-submit">Add Transaction</button>
        </form>
    `;

    // Prevent default browser submission; caller handles onsubmit via event delegation.
    const form = document.getElementById('expense-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
        });
    }
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

/**
 * Clear and reset all transaction form fields to their default state.
 * Also hides any visible validation error message.
 */
export function resetForm() {
    const form = document.getElementById('expense-form');
    if (form) {
        form.reset();
    }

    // Hide error banner if present
    const errorEl = document.getElementById('form-error');
    if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
    }
}

/**
 * Show a validation error message inside the form.
 * @param {string} message - The error text to display.
 */
export function showFormError(message) {
    const errorEl = document.getElementById('form-error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}
