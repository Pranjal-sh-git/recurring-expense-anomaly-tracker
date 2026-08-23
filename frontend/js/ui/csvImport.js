/**
 * csvImport.js — CSV Import & Export Controller
 *
 * Responsibilities:
 *   - Handle file selection & reading for CSV bulk uploads.
 *   - Parse & validate CSV rows via dataService.parseCSV.
 *   - Bulk insert accepted transactions via transactionStore.loadDemoData(..., true).
 *   - Trigger global app refresh.
 *   - Show non-intrusive feedback toast notifications for imported count & skipped rows.
 *   - Generate and download a sample CSV template with one click.
 */

import { parseCSV } from '../services/dataService.js';
import { loadDemoData } from '../state/transactionStore.js';

/**
 * Initialize CSV Import and Template Download event listeners.
 * @param {Function} onImportSuccess - Callback to refresh application state after import.
 */
export function initCSVImport(onImportSuccess) {
    const importBtn = document.getElementById('btn-import-csv');
    const fileInput = document.getElementById('csv-file-input');
    const sampleBtn = document.getElementById('btn-sample-csv');

    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                _processCSV(text, onImportSuccess);
                fileInput.value = ''; // Reset input so same file can be selected again if needed
            };
            reader.onerror = () => {
                _showToast('Failed to read the selected file. Please try again.', 'error');
                fileInput.value = '';
            };
            reader.readAsText(file);
        });
    }

    if (sampleBtn) {
        sampleBtn.addEventListener('click', () => {
            _downloadSampleCSV();
        });
    }
}

function _processCSV(csvText, onImportSuccess) {
    if (!csvText || !csvText.trim()) {
        _showToast('The selected CSV file is empty.', 'error');
        return;
    }

    try {
        const result = parseCSV(csvText);

        if (!result.transactions || result.transactions.length === 0) {
            const errMsg = result.skipped.length > 0
                ? `No valid transactions found (${result.skipped.length} invalid rows skipped). Please check headers: title, amount, category, date.`
                : 'No valid transactions found in file. Please ensure standard CSV format.';
            _showToast(errMsg, 'error');
            return;
        }

        // Load into transaction store (append = true)
        loadDemoData(result.transactions, true);

        // Refresh UI
        if (typeof onImportSuccess === 'function') {
            onImportSuccess();
        }

        const count = result.transactions.length;
        const skippedCount = result.skipped.length;
        let successMsg = `Successfully imported ${count} transaction${count > 1 ? 's' : ''}!`;
        if (skippedCount > 0) {
            successMsg += ` (${skippedCount} invalid row${skippedCount > 1 ? 's' : ''} skipped)`;
        }

        _showToast(successMsg, 'success');
    } catch (err) {
        console.error('CSV Import Error:', err);
        _showToast(`Import failed: ${err.message || 'Unknown error'}`, 'error');
    }
}

function _downloadSampleCSV() {
    const sampleContent = `title,amount,category,date,recurring
Netflix Premium 4K,649,Subscriptions,2026-08-01,true
Fresh Supermarket Groceries,3240,Groceries,2026-08-03,false
Apartment Monthly Rent,18000,Rent,2026-08-01,true
Electricity Utility Bill,1680,Utilities,2026-08-05,true
Fine Dining Dinner,2150,Dining,2026-08-08,false
Fuel & Highway Toll,1400,Transport,2026-08-11,false
Health Pharmacy Prescriptions,850,Healthcare,2026-08-14,false
Amazon Electronics Purchase,6500,Shopping,2026-08-15,false`;

    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_transactions_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    _showToast('Sample CSV template downloaded!', 'info');
}

/**
 * Lightweight floating feedback toast.
 */
function _showToast(message, type = 'info') {
    let toast = document.getElementById('csv-import-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'csv-import-toast';
        toast.className = 'csv-toast';
        document.body.appendChild(toast);
    }

    toast.className = `csv-toast csv-toast--${type} csv-toast--visible`;
    toast.innerHTML = `
        <span class="csv-toast-icon">${type === 'success' ? '✓' : type === 'error' ? '⚠️' : 'ℹ️'}</span>
        <span class="csv-toast-text">${message}</span>
    `;

    if (toast._hideTimeout) clearTimeout(toast._hideTimeout);
    toast._hideTimeout = setTimeout(() => {
        toast.classList.remove('csv-toast--visible');
    }, 4000);
}
