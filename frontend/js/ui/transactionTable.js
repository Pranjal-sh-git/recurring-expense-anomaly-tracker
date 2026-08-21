/**
 * Transaction Table UI Module
 * Handles rendering the transaction history table structure placeholder.
 */

export function initTransactionTable() {
    console.log("Transaction Table UI Module initialized.");

    const container = document.getElementById('transaction-table-container');
    if (!container) return;

    // Render the basic placeholder table structure with mock rows
    container.innerHTML = `
        <div class="table-responsive">
            <table class="transaction-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description / Merchant</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Type</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="transaction-table-body">
                    <tr>
                        <td>2026-08-20</td>
                        <td>Netflix Premium Plan</td>
                        <td>Subscriptions</td>
                        <td>$19.99</td>
                        <td>Recurring</td>
                        <td style="color: var(--success); font-weight: 500;">Normal</td>
                    </tr>
                    <tr>
                        <td>2026-08-19</td>
                        <td>Electric Bill</td>
                        <td>Utilities</td>
                        <td>$142.50</td>
                        <td>Recurring</td>
                        <td style="color: var(--success); font-weight: 500;">Normal</td>
                    </tr>
                    <tr>
                        <td>2026-08-18</td>
                        <td>Local Bistro</td>
                        <td>Dining</td>
                        <td>$45.00</td>
                        <td>One-off</td>
                        <td style="color: var(--success); font-weight: 500;">Normal</td>
                    </tr>
                    <tr>
                        <td>2026-08-15</td>
                        <td>Software Subscription (Double charge)</td>
                        <td>Subscriptions</td>
                        <td>$80.00</td>
                        <td>Recurring</td>
                        <td style="color: var(--danger); font-weight: 600;">Anomaly</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}
