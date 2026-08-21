/**
 * Forms UI Module
 * Handles rendering the transaction entry form structure placeholder.
 */

export function initForm() {
    console.log("Forms UI Module initialized.");
    
    const container = document.getElementById('transaction-form-container');
    if (!container) return;

    // Render the basic placeholder form structure
    container.innerHTML = `
        <form class="transaction-form" id="expense-form">
            <div class="form-group">
                <label for="tx-date">Date</label>
                <input type="date" id="tx-date" class="form-control" required>
            </div>
            
            <div class="form-group">
                <label for="tx-description">Description / Merchant</label>
                <input type="text" id="tx-description" class="form-control" placeholder="e.g. Netflix Subscription" required>
            </div>
            
            <div class="form-group">
                <label for="tx-category">Category</label>
                <select id="tx-category" class="form-control" required>
                    <option value="" disabled selected>Select category...</option>
                    <option value="Subscriptions">Subscriptions</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Rent">Rent</option>
                    <option value="Dining">Dining</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="tx-amount">Amount ($)</label>
                <input type="number" id="tx-amount" class="form-control" placeholder="0.00" step="0.01" min="0" required>
            </div>

            <div class="form-group" style="flex-direction: row; gap: 0.5rem; align-items: center; margin: 0.5rem 0;">
                <input type="checkbox" id="tx-recurring">
                <label for="tx-recurring">Recurring Expense</label>
            </div>

            <button type="submit" class="btn-submit" style="cursor: pointer; opacity: 1;">Add Transaction</button>
        </form>
    `;

    // Intercept form submission to prevent actual submission
    const form = document.getElementById('expense-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log("Form submission intercepted (submission disabled in Phase 1).");
            alert("Transaction submission is disabled in Phase 1.");
        });
    }
}
