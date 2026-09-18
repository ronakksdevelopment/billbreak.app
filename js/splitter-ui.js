/**
 * splitter-ui.js
 * -----------------------------------------------------------------------
 * Wires up the QR Splitter (home) screen: reading the amount, running
 * the split algorithm, rendering each resulting QR code with the app
 * logo overlay, per-code "mark as paid" confirmation with an animated
 * checkmark, and saving the finished bill as a transaction.
 * -----------------------------------------------------------------------
 */

const BBSplitterUI = (() => {
  const els = {};
  let currentSplit = null; // { parts, count }
  let confirmedFlags = [];

  function cacheEls() {
    els.amountInput = document.getElementById('bill-amount-input');
    els.amountError = document.getElementById('amount-error');
    els.upiDisplay = document.getElementById('current-upi-display');
    els.editUpiBtn = document.getElementById('edit-upi-quick-btn');
    els.optionalToggle = document.getElementById('optional-fields-toggle');
    els.optionalFields = document.getElementById('optional-fields');
    els.customerNameInput = document.getElementById('customer-name-input');
    els.customerPhoneInput = document.getElementById('customer-phone-input');
    els.noteInput = document.getElementById('payment-note-input');
    els.generateBtn = document.getElementById('generate-qr-btn');
    els.resultsContainer = document.getElementById('qr-results-container');
  }

  function refreshUpiDisplay() {
    const profile = BBStorage.getProfile();
    els.upiDisplay.textContent = profile.upiId || 'Add your UPI ID';
    if (profile.defaultAmount && !els.amountInput.value) {
      els.amountInput.value = profile.defaultAmount;
    }
  }

  function toggleOptionalFields() {
    const isOpen = els.optionalFields.classList.toggle('is-open');
    els.optionalToggle.setAttribute('aria-expanded', String(isOpen));
  }

  function showAmountError(show) {
    els.amountError.hidden = !show;
  }

  function handleGenerate() {
    const profile = BBStorage.getProfile();

    if (!BBUpi.isValidUpiId(profile.upiId)) {
      BBToast.show('Please add a valid UPI ID in Settings first', { type: 'error' });
      BBNavigation.goToTab('settings');
      return;
    }

    const amountValue = parseFloat(els.amountInput.value);
    const result = BBSplitter.splitBill(amountValue);

    if (result.error) {
      showAmountError(true);
      els.amountInput.focus();
      return;
    }
    showAmountError(false);

    currentSplit = result;
    confirmedFlags = new Array(result.count).fill(false);

    renderResults(result, profile);
  }

  async function renderResults(result, profile) {
    const { parts } = result;
    const customerName = els.customerNameInput.value.trim();
    const note = els.noteInput.value.trim();

    els.resultsContainer.innerHTML = buildResultsSkeleton(parts.length);

    // Give the skeleton a frame to paint before the (fast, sync) QR
    // rendering work runs, so the loading state is actually visible.
    await new Promise((r) => requestAnimationFrame(r));

    const summaryHtml = `
      <div class="split-summary">
        <div class="split-summary__stat">
          <strong>${parts.length}</strong>
          <span>QR CODE${parts.length > 1 ? 'S' : ''}</span>
        </div>
        <div class="split-summary__divider"></div>
        <div class="split-summary__stat">
          <strong>₹${BBSplitterUI._fmt(Math.max(...parts))}</strong>
          <span>MAX PER CODE</span>
        </div>
        <div class="split-summary__divider"></div>
        <div class="split-summary__stat">
          <strong>₹0</strong>
          <span>FEE CHARGED</span>
        </div>
      </div>
      <div class="qr-results">
        <div class="qr-results__heading">
          <h2 style="font-size:var(--fs-md);">Scan to pay</h2>
          <span class="badge badge-success"><i class="fa-solid fa-shield-check" aria-hidden="true"></i> Compliant</span>
        </div>
        <div class="qr-grid" id="qr-grid"></div>
      </div>
      <div class="finalize-bar">
        <button class="btn btn-secondary btn-block ripple-surface" id="save-transaction-btn">
          <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Save to transaction history
        </button>
        <button class="reset-link" id="reset-splitter-btn" type="button">
          <i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Start a new bill
        </button>
      </div>
    `;

    els.resultsContainer.innerHTML = summaryHtml;

    const grid = document.getElementById('qr-grid');

    for (let i = 0; i < parts.length; i++) {
      const card = buildQrCard(i, parts.length, parts[i]);
      grid.appendChild(card);

      const canvas = card.querySelector('canvas');
      const link = BBUpi.buildUpiLink({
        payeeUpiId: profile.upiId,
        amount: parts[i],
        payeeName: profile.businessName,
        note: note || (parts.length > 1 ? `Payment ${i + 1} of ${parts.length}` : 'Payment'),
      });

      // eslint-disable-next-line no-await-in-loop
      await BBQrRender.renderToCanvas(canvas, link);
      card.style.animationDelay = `${i * 60}ms`;
    }

    document.getElementById('save-transaction-btn').addEventListener('click', () => {
      saveCurrentAsTransaction(profile, customerName);
    });
    document.getElementById('reset-splitter-btn').addEventListener('click', resetSplitter);
  }

  function buildResultsSkeleton(count) {
    let cards = '';
    for (let i = 0; i < Math.min(count, 4); i++) {
      cards += `
        <div class="card" style="padding:var(--sp-4);">
          <div class="skeleton" style="width:100%;aspect-ratio:1/1;border-radius:12px;margin-bottom:var(--sp-3);"></div>
          <div class="skeleton skeleton-line" style="width:60%;height:16px;margin:0 auto var(--sp-2);"></div>
          <div class="skeleton skeleton-line" style="width:80%;height:36px;margin:0 auto;border-radius:10px;"></div>
        </div>
      `;
    }
    return `
      <div class="split-summary">
        <div class="skeleton skeleton-line" style="width:100%;height:44px;"></div>
      </div>
      <div class="qr-grid" style="margin-top:var(--sp-5);">${cards}</div>
    `;
  }

  function buildQrCard(index, total, amount) {
    const card = document.createElement('div');
    card.className = 'qr-card';
    card.dataset.index = String(index);
    card.innerHTML = `
      <div class="qr-card__index">${total > 1 ? `Code ${index + 1} of ${total}` : 'Single payment'}</div>
      <div class="qr-card__canvas-wrap">
        <canvas aria-label="UPI QR code for payment of ₹${BBSplitterUI._fmt(amount)}"></canvas>
      </div>
      <div class="qr-card__amount">₹${BBSplitterUI._fmt(amount)}</div>
      <div class="qr-card__status" id="status-${index}">Awaiting payment</div>
      <button class="btn btn-success btn-sm confirm-paid-btn ripple-surface" data-confirm-index="${index}" type="button">
        <i class="fa-solid fa-check" aria-hidden="true"></i> Mark as paid
      </button>
    `;

    card.querySelector('[data-confirm-index]').addEventListener('click', (e) => {
      handleConfirmPaid(index, e.currentTarget);
    });

    return card;
  }

  function handleConfirmPaid(index, btnEl) {
    if (confirmedFlags[index]) return;
    confirmedFlags[index] = true;

    btnEl.classList.add('is-confirmed');
    btnEl.innerHTML = '<i class="fa-solid fa-check-double" aria-hidden="true"></i> Paid';
    const statusEl = document.getElementById(`status-${index}`);
    if (statusEl) {
      statusEl.textContent = 'Payment confirmed';
      statusEl.classList.add('is-paid');
    }

    showSuccessCheckAnimation();
  }

  function showSuccessCheckAnimation() {
    const root = document.getElementById('modal-root');
    const overlay = document.createElement('div');
    overlay.className = 'success-check-overlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = `
      <div class="success-check-card">
        <svg class="check-circle-svg" viewBox="0 0 80 80" aria-hidden="true">
          <circle class="circle" cx="40" cy="40" r="36" />
          <polyline class="tick" points="24,42 35,53 57,29" />
        </svg>
        <h3>Payment confirmed</h3>
        <p>Marked as paid in this session. No backend verification is performed — this simply tracks it for your records.</p>
      </div>
    `;
    root.appendChild(overlay);

    setTimeout(() => {
      overlay.classList.add('is-closing');
      overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
    }, 1400);
  }

  function saveCurrentAsTransaction(profile, customerName) {
    if (!currentSplit) return;

    const tx = {
      id: BBStorage.generateId(),
      createdAt: Date.now(),
      totalAmount: currentSplit.parts.reduce((a, b) => a + b, 0),
      customerName: customerName || '',
      customerPhone: els.customerPhoneInput.value.trim() || '',
      note: els.noteInput.value.trim() || '',
      upiId: profile.upiId,
      businessName: profile.businessName,
      qrAmounts: currentSplit.parts.slice(),
      confirmedCount: confirmedFlags.filter(Boolean).length,
    };

    BBStorage.addTransaction(tx);
    BBToast.show('Transaction saved to history');

    if (typeof BBTransactions !== 'undefined') {
      BBTransactions.refresh();
    }
  }

  function resetSplitter() {
    currentSplit = null;
    confirmedFlags = [];
    els.amountInput.value = '';
    els.customerNameInput.value = '';
    els.customerPhoneInput.value = '';
    els.noteInput.value = '';
    els.resultsContainer.innerHTML = '';
    els.optionalFields.classList.remove('is-open');
    els.optionalToggle.setAttribute('aria-expanded', 'false');
    els.amountInput.focus();
  }

  function _fmt(n) {
    return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function init() {
    cacheEls();
    refreshUpiDisplay();

    els.generateBtn.addEventListener('click', handleGenerate);
    els.optionalToggle.addEventListener('click', toggleOptionalFields);
    els.editUpiBtn.addEventListener('click', () => BBNavigation.goToTab('settings'));

    els.amountInput.addEventListener('input', () => showAmountError(false));
    els.amountInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleGenerate();
      }
    });
  }

  return { init, refreshUpiDisplay, _fmt };
})();
