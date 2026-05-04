// ============================================================
// ConfirmDialog.js — Reusable Custom Confirm Dialog
// ============================================================
// Replaces native confirm() with a styled modal that returns
// a Promise<boolean>. Uses I18n for button labels.
// ============================================================

/**
 * Show a custom confirm dialog matching the game's visual style.
 *
 * @param {string} message - The message to display in the dialog body.
 * @param {object} [options] - Optional overrides.
 * @param {string} [options.confirmText] - Override confirm button text (defaults to I18n.t('common.confirm')).
 * @param {string} [options.cancelText]  - Override cancel button text  (defaults to I18n.t('common.cancel')).
 * @returns {Promise<boolean>} Resolves `true` on confirm, `false` on cancel/backdrop click.
 */
function showConfirmDialog(message, options = {}) {
  return new Promise((resolve) => {
    // --- Overlay ---
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';

    // --- Card ---
    const card = document.createElement('div');
    card.className = 'confirm-dialog-card';

    // --- Message ---
    const msgEl = document.createElement('div');
    msgEl.className = 'confirm-dialog-message';
    msgEl.textContent = message;

    // --- Buttons ---
    const btnRow = document.createElement('div');
    btnRow.className = 'confirm-dialog-buttons';

    const confirmLabel = options.confirmText || (typeof I18n !== 'undefined' ? I18n.t('common.confirm') : 'Confirm');
    const cancelLabel  = options.cancelText  || (typeof I18n !== 'undefined' ? I18n.t('common.cancel')  : 'Cancel');

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'confirm-dialog-btn confirm-dialog-btn-cancel';
    cancelBtn.textContent = cancelLabel;

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'confirm-dialog-btn confirm-dialog-btn-confirm';
    confirmBtn.textContent = confirmLabel;

    // --- Cleanup helper ---
    let settled = false;
    function close(result) {
      if (settled) return;
      settled = true;
      overlay.classList.remove('visible');
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 250); // match CSS transition
    }

    // --- Event listeners ---
    confirmBtn.addEventListener('click', () => close(true));
    cancelBtn.addEventListener('click', () => close(false));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });

    // --- Assemble DOM ---
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(confirmBtn);
    card.appendChild(msgEl);
    card.appendChild(btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Trigger entrance animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('visible');
      });
    });

    // Focus the cancel button by default for safety
    cancelBtn.focus();
  });
}
