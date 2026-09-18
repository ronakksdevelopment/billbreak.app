/**
 * settings.js
 * -----------------------------------------------------------------------
 * Settings & Profile screen: editing business name / UPI ID / default
 * amount, dark mode toggle, About section, and data management
 * (export all / clear all).
 * -----------------------------------------------------------------------
 */

const BBSettings = (() => {
  const els = {};

  function cacheEls() {
    els.form = document.getElementById('settings-form');
    els.businessNameInput = document.getElementById('settings-business-name');
    els.upiIdInput = document.getElementById('settings-upi-id');
    els.defaultAmountInput = document.getElementById('settings-default-amount');
    els.darkModeToggle = document.getElementById('dark-mode-toggle');
    els.avatarInitial = document.getElementById('settings-avatar-initial');
    els.businessNameDisplay = document.getElementById('settings-business-name-display');
    els.upiDisplay = document.getElementById('settings-upi-display');
    els.exportAllBtn = document.getElementById('export-all-data-btn');
    els.clearAllBtn = document.getElementById('clear-all-data-btn');
  }

  function loadProfileIntoForm() {
    const profile = BBStorage.getProfile();
    els.businessNameInput.value = profile.businessName;
    els.upiIdInput.value = profile.upiId;
    els.defaultAmountInput.value = profile.defaultAmount || '';
    updateProfileCard(profile);
  }

  function updateProfileCard(profile) {
    els.businessNameDisplay.textContent = profile.businessName || 'Your business';
    els.upiDisplay.textContent = profile.upiId || 'No UPI ID set';
    els.avatarInitial.textContent = (profile.businessName || 'B').trim().charAt(0).toUpperCase();
  }

  function handleSubmit(e) {
    e.preventDefault();

    const upiField = els.upiIdInput.closest('.field');
    const upiValue = els.upiIdInput.value.trim();

    if (!BBUpi.isValidUpiId(upiValue)) {
      upiField.classList.add('has-error');
      els.upiIdInput.focus();
      return;
    }
    upiField.classList.remove('has-error');

    BBStorage.saveProfile({
      businessName: els.businessNameInput.value.trim(),
      upiId: upiValue,
      defaultAmount: els.defaultAmountInput.value ? parseFloat(els.defaultAmountInput.value) : '',
    });

    updateProfileCard(BBStorage.getProfile());
    BBSplitterUI.refreshUpiDisplay();
    BBToast.show('Settings saved');
  }

  function handleClearAllData() {
    const root = document.getElementById('modal-root');
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop center';
    overlay.innerHTML = `
      <div class="modal-dialog" role="alertdialog" aria-labelledby="clear-title">
        <div class="modal-dialog__icon danger"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></div>
        <h3 id="clear-title">Clear all data?</h3>
        <p>This permanently deletes your business profile and every saved transaction from this device. This cannot be undone.</p>
        <div class="modal-dialog__actions">
          <button class="btn btn-secondary" id="cancel-clear-btn" type="button">Cancel</button>
          <button class="btn" style="background:var(--color-danger); color:#fff;" id="confirm-clear-btn" type="button">Clear everything</button>
        </div>
      </div>
    `;
    root.appendChild(overlay);

    const close = () => {
      overlay.classList.add('is-closing');
      overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
    };

    overlay.querySelector('#cancel-clear-btn').addEventListener('click', close);
    overlay.querySelector('#confirm-clear-btn').addEventListener('click', () => {
      BBStorage.clearAllData();
      close();
      window.location.reload();
    });
  }

  function handleExportAll() {
    const transactions = BBStorage.getTransactions();
    const profile = BBStorage.getProfile();

    if (transactions.length === 0) {
      BBToast.show('No transaction data to export', { type: 'error' });
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      transactions,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billbreak-full-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    BBToast.show('Full data export downloaded');
  }

  function init() {
    cacheEls();
    loadProfileIntoForm();

    els.form.addEventListener('submit', handleSubmit);
    els.upiIdInput.addEventListener('input', () => {
      els.upiIdInput.closest('.field').classList.remove('has-error');
    });

    els.darkModeToggle.addEventListener('change', (e) => {
      BBTheme.setExplicit(e.target.checked ? 'dark' : 'light');
    });

    els.exportAllBtn.addEventListener('click', handleExportAll);
    els.clearAllBtn.addEventListener('click', handleClearAllData);
  }

  return { init, refreshProfileCard: () => updateProfileCard(BBStorage.getProfile()) };
})();
