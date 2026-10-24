/**
 * editTransactionModal.js — Transaction Edit Modal Controller
 *
 * Provides a sleek, accessible, glassmorphic modal for updating
 * an existing transaction's details (title, amount, category, date, recurring).
 *
 * Exports:
 *   initEditModal(onSave)     — Binds modal triggers, escape keys, and form submission.
 *   openEditModal(transaction) — Pre-fills the form and animates the modal open.
 *   closeEditModal()           — Animates the modal closed and resets internal state.
 *   showEditModalToast(msg, type) — Displays a floating notification toast.
 */

// ─── Module State ─────────────────────────────────────────────────────────────

let _onSaveCallback = null;

// ─── DOM Element Getters ──────────────────────────────────────────────────────

function getElements() {
    return {
        backdrop:   document.getElementById('edit-modal-backdrop'),
        container:  document.querySelector('.edit-modal-container'),
        form:       document.getElementById('edit-transaction-form'),
        closeBtn:   document.getElementById('edit-modal-close-btn'),
        cancelBtn:  document.getElementById('btn-edit-modal-cancel'),
        errorEl:    document.getElementById('edit-form-error'),
        idInput:    document.getElementById('edit-tx-id'),
        titleInput: document.getElementById('edit-tx-title'),
        amountInput: document.getElementById('edit-tx-amount'),
        categoryInput: document.getElementById('edit-tx-category'),
        dateInput:  document.getElementById('edit-tx-date'),
        recurringInput: document.getElementById('edit-tx-recurring'),
    };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialize the Edit Modal module and bind event listeners.
 * @param {Function} onSave - Callback invoked with updated transaction object on form submit.
 */
export function initEditModal(onSave) {
    _onSaveCallback = typeof onSave === 'function' ? onSave : null;

    const els = getElements();
    if (!els.backdrop || !els.form) {
        console.warn('initEditModal: Modal elements not found in DOM.');
        return;
    }

    // Close button (X)
    if (els.closeBtn) {
        els.closeBtn.addEventListener('click', closeEditModal);
    }

    // Cancel button
    if (els.cancelBtn) {
        els.cancelBtn.addEventListener('click', closeEditModal);
    }

    // Click outside container on backdrop overlay to dismiss
    els.backdrop.addEventListener('click', (e) => {
        if (e.target === els.backdrop) {
            closeEditModal();
        }
    });

    // Keyboard Escape to dismiss
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && els.backdrop.classList.contains('edit-modal--visible')) {
            closeEditModal();
        }
    });

    // Form submission
    els.form.addEventListener('submit', (e) => {
        e.preventDefault();
        _handleFormSubmit();
    });
}

/**
 * Open the modal pre-filled with the provided transaction's data.
 * @param {Object} tx - The transaction to edit.
 */
export function openEditModal(tx) {
    if (!tx || !tx.id) {
        console.warn('openEditModal: Invalid transaction provided.');
        return;
    }

    const els = getElements();
    if (!els.backdrop) return;

    // Pre-populate fields
    if (els.idInput)        els.idInput.value = tx.id;
    if (els.titleInput)     els.titleInput.value = tx.title || '';
    if (els.amountInput)    els.amountInput.value = tx.amount != null ? tx.amount : '';
    if (els.categoryInput)  els.categoryInput.value = tx.category || '';
    if (els.dateInput)      els.dateInput.value = tx.date || '';
    if (els.recurringInput) els.recurringInput.checked = Boolean(tx.recurring);

    // Hide any previous error
    if (els.errorEl) {
        els.errorEl.style.display = 'none';
        els.errorEl.textContent = '';
    }

    // Show modal with backdrop blur & smooth spring entrance
    els.backdrop.classList.add('edit-modal--visible');
    document.body.style.overflow = 'hidden';

    // Focus first input field for immediate typing
    setTimeout(() => {
        if (els.titleInput) {
            els.titleInput.focus();
            els.titleInput.select();
        }
    }, 150);
}

/**
 * Close the edit modal and reset state.
 */
export function closeEditModal() {
    const els = getElements();
    if (!els.backdrop) return;

    els.backdrop.classList.remove('edit-modal--visible');
    document.body.style.overflow = '';

    if (els.errorEl) {
        els.errorEl.style.display = 'none';
        els.errorEl.textContent = '';
    }

    if (els.form) {
        els.form.reset();
    }
}

/**
 * Display an inline error message in the edit modal.
 * @param {string} msg
 */
export function showEditModalError(msg) {
    const els = getElements();
    if (els.errorEl) {
        els.errorEl.textContent = msg;
        els.errorEl.style.display = 'block';
    }
}

/**
 * Display a floating feedback toast for update confirmation.
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='success']
 */
export function showEditModalToast(message, type = 'success') {
    let toast = document.getElementById('app-notification-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-notification-toast';
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
    }, 3500);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _handleFormSubmit() {
    const els = getElements();

    const id        = els.idInput ? els.idInput.value : '';
    const title     = els.titleInput ? els.titleInput.value.trim() : '';
    const amountVal = els.amountInput ? parseFloat(els.amountInput.value) : 0;
    const category  = els.categoryInput ? els.categoryInput.value : '';
    const date      = els.dateInput ? els.dateInput.value : '';
    const recurring = els.recurringInput ? els.recurringInput.checked : false;

    // UI-level validation
    if (!title) {
        showEditModalError('Please enter a title or merchant name.');
        els.titleInput?.focus();
        return;
    }
    if (isNaN(amountVal) || amountVal <= 0) {
        showEditModalError('Please enter a valid positive amount.');
        els.amountInput?.focus();
        return;
    }
    if (!category) {
        showEditModalError('Please select an expense category.');
        els.categoryInput?.focus();
        return;
    }
    if (!date) {
        showEditModalError('Please select a valid date.');
        els.dateInput?.focus();
        return;
    }

    if (_onSaveCallback) {
        _onSaveCallback({
            id,
            title,
            amount: amountVal,
            category,
            date,
            recurring,
        });
    }
}
