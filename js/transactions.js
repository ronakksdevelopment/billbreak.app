/**
 * transactions.js
 * -----------------------------------------------------------------------
 * Recent Transactions screen: list rendering, search, date-range /
 * name / amount filtering, swipe-to-delete, CSV/PDF export, and
 * per-transaction WhatsApp / Web Share receipt sharing.
 * -----------------------------------------------------------------------
 */

const BBTransactions = (() => {
  const els = {};
  let activeRange = 'all';
  let customFrom = null;
  let customTo = null;
  let searchTerm = '';

  function cacheEls() {
    els.searchInput = document.getElementById('tx-search-input');
    els.chips = Array.from(document.querySelectorAll('.chip[data-range]'));
    els.customPanel = document.getElementById('custom-date-panel');
    els.dateFrom = document.getElementById('date-range-from');
    els.dateTo = document.getElementById('date-range-to');
    els.countLabel = document.getElementById('tx-count-label');
    els.listContainer = document.getElementById('tx-list-container');
    els.exportBtn = document.getElementById('export-menu-btn');
  }

  function formatDateTime(epochMs) {
    const d = new Date(epochMs);
    const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} · ${timeStr}`;
  }

  function isInRange(tx) {
    const now = new Date();
    const txDate = new Date(tx.createdAt);

    if (activeRange === 'today') {
      return txDate.toDateString() === now.toDateString();
    }
    if (activeRange === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return txDate >= weekAgo;
    }
    if (activeRange === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return txDate >= monthAgo;
    }
    if (activeRange === 'custom') {
      if (customFrom && txDate < new Date(customFrom + 'T00:00:00')) return false;
      if (customTo && txDate > new Date(customTo + 'T23:59:59')) return false;
      return true;
    }
    return true; // 'all'
  }

  function matchesSearch(tx) {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = (tx.customerName || '').toLowerCase().includes(term);
    const amountMatch = String(tx.totalAmount).includes(term);
    const noteMatch = (tx.note || '').toLowerCase().includes(term);
    return nameMatch || amountMatch || noteMatch;
  }

  function getFilteredTransactions() {
    return BBStorage.getTransactions().filter((tx) => isInRange(tx) && matchesSearch(tx));
  }

  function render() {
    const all = getFilteredTransactions();
    els.countLabel.textContent = `${all.length} transaction${all.length === 1 ? '' : 's'}`;

    if (all.length === 0) {
      renderEmptyState();
      return;
    }

    const list = document.createElement('div');
    list.className = 'tx-list';

    all.forEach((tx) => {
      list.appendChild(buildTxItem(tx));
    });

    els.listContainer.innerHTML = '';
    els.listContainer.appendChild(list);
  }

  function renderEmptyState() {
    const hasAnyTransactions = BBStorage.getTransactions().length > 0;
    if (hasAnyTransactions) {
      // Filters/search produced zero results.
      els.listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></div>
          <h3>No matching transactions</h3>
          <p>Try a different search term or widen your date range.</p>
        </div>
      `;
    } else {
      els.listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon"><i class="fa-solid fa-receipt" aria-hidden="true"></i></div>
          <h3>No transactions yet</h3>
          <p>Bills you save from the Split Bill tab will show up here with full history and receipts.</p>
        </div>
      `;
    }
  }

  function buildTxItem(tx) {
    const item = document.createElement('div');
    item.className = 'tx-item';
    item.dataset.id = tx.id;
    item.innerHTML = `
      <div class="tx-item__icon"><i class="fa-solid fa-qrcode" aria-hidden="true"></i></div>
      <div class="tx-item__body">
        <div class="tx-item__top-row">
          <span class="tx-item__name">${escapeHtml(tx.customerName) || 'Walk-in customer'}</span>
          <span class="tx-item__amount">₹${BBSplitterUI._fmt(tx.totalAmount)}</span>
        </div>
        <div class="tx-item__meta">
          <span><i class="fa-regular fa-clock" aria-hidden="true"></i> ${formatDateTime(tx.createdAt)}</span>
          <span class="tx-item__qr-count">${tx.qrAmounts.length} QR${tx.qrAmounts.length > 1 ? 's' : ''}</span>
        </div>
      </div>
      <button class="tx-item__menu-btn" aria-label="Transaction options" data-open-detail="${tx.id}">
        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
      </button>
      <div class="tx-item__delete-reveal" aria-hidden="true"><i class="fa-solid fa-trash"></i></div>
    `;

    item.querySelector('[data-open-detail]').addEventListener('click', () => openDetailSheet(tx));

    attachSwipeToDelete(item, tx.id);

    return item;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ---- Swipe (or tap-and-hold) to delete ----
  function attachSwipeToDelete(item, txId) {
    let startX = 0;
    let currentX = 0;
    let dragging = false;
    const threshold = -70;

    item.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      dragging = true;
      item.classList.add('is-swiping');
    }, { passive: true });

    item.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      currentX = e.touches[0].clientX - startX;
      if (currentX < 0) {
        item.style.transform = `translateX(${Math.max(currentX, -84)}px)`;
      }
    }, { passive: true });

    item.addEventListener('touchend', () => {
      dragging = false;
      item.classList.remove('is-swiping');
      if (currentX < threshold) {
        confirmDelete(txId, item);
      } else {
        item.style.transform = '';
      }
      currentX = 0;
    });
  }

  function confirmDelete(txId, itemEl) {
    const root = document.getElementById('modal-root');
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop center';
    overlay.innerHTML = `
      <div class="modal-dialog" role="alertdialog" aria-labelledby="delete-title" aria-describedby="delete-desc">
        <div class="modal-dialog__icon danger"><i class="fa-solid fa-trash" aria-hidden="true"></i></div>
        <h3 id="delete-title">Delete this transaction?</h3>
        <p id="delete-desc">This can't be undone. The transaction record will be permanently removed from this device.</p>
        <div class="modal-dialog__actions">
          <button class="btn btn-secondary" id="cancel-delete-btn" type="button">Cancel</button>
          <button class="btn btn-danger-ghost" style="background:var(--color-danger);color:#fff;" id="confirm-delete-btn" type="button">Delete</button>
        </div>
      </div>
    `;
    root.appendChild(overlay);

    const close = () => {
      overlay.classList.add('is-closing');
      overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
    };

    overlay.querySelector('#cancel-delete-btn').addEventListener('click', () => {
      itemEl.style.transform = '';
      close();
    });
    overlay.querySelector('#confirm-delete-btn').addEventListener('click', () => {
      BBStorage.deleteTransaction(txId);
      close();
      render();
      BBToast.show('Transaction deleted');
    });
  }

  // ---- Detail sheet with share / receipt ----
  function openDetailSheet(tx) {
    const root = document.getElementById('modal-root');
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';

    const qrListHtml = tx.qrAmounts
      .map((amt, i) => `
        <div class="tx-detail-qr-item">
          <span>QR ${i + 1}</span>
          <span>₹${BBSplitterUI._fmt(amt)}</span>
        </div>
      `)
      .join('');

    overlay.innerHTML = `
      <div class="modal-sheet" role="dialog" aria-labelledby="tx-detail-title">
        <div class="modal-sheet__handle"></div>
        <div class="modal-sheet__header">
          <h2 id="tx-detail-title">Transaction details</h2>
          <button class="topbar__action" id="close-detail-btn" aria-label="Close" type="button">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <dl>
          <div class="tx-detail-row"><dt>Total amount</dt><dd>₹${BBSplitterUI._fmt(tx.totalAmount)}</dd></div>
          <div class="tx-detail-row"><dt>Date &amp; time</dt><dd>${formatDateTime(tx.createdAt)}</dd></div>
          <div class="tx-detail-row"><dt>Customer</dt><dd>${escapeHtml(tx.customerName) || '—'}</dd></div>
          <div class="tx-detail-row"><dt>Contact</dt><dd>${escapeHtml(tx.customerPhone) || '—'}</dd></div>
          <div class="tx-detail-row"><dt>Note</dt><dd>${escapeHtml(tx.note) || '—'}</dd></div>
          <div class="tx-detail-row"><dt>QR codes generated</dt><dd>${tx.qrAmounts.length}</dd></div>
        </dl>

        <div class="tx-detail-qr-list">${qrListHtml}</div>

        <div class="tx-detail-actions">
          <button class="btn btn-secondary" id="share-whatsapp-btn" type="button">
            <i class="fa-brands fa-whatsapp" aria-hidden="true"></i> WhatsApp
          </button>
          <button class="btn btn-secondary" id="share-native-btn" type="button">
            <i class="fa-solid fa-share-nodes" aria-hidden="true"></i> Share
          </button>
          <button class="btn btn-danger-ghost btn-block-full" id="delete-from-detail-btn" type="button">
            <i class="fa-solid fa-trash" aria-hidden="true"></i> Delete transaction
          </button>
        </div>
      </div>
    `;

    root.appendChild(overlay);

    const close = () => {
      overlay.classList.add('is-closing');
      overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    overlay.querySelector('#close-detail-btn').addEventListener('click', close);
    overlay.querySelector('#share-whatsapp-btn').addEventListener('click', () => shareReceipt(tx, 'whatsapp'));
    overlay.querySelector('#share-native-btn').addEventListener('click', () => shareReceipt(tx, 'native'));
    overlay.querySelector('#delete-from-detail-btn').addEventListener('click', () => {
      close();
      const itemEl = document.querySelector(`.tx-item[data-id="${tx.id}"]`);
      confirmDelete(tx.id, itemEl || document.createElement('div'));
    });
  }

  function buildReceiptText(tx) {
    const lines = [
      `🧾 ${tx.businessName || 'BillBreak Receipt'}`,
      `Amount: ₹${BBSplitterUI._fmt(tx.totalAmount)}`,
      `Date: ${formatDateTime(tx.createdAt)}`,
    ];
    if (tx.customerName) lines.push(`Customer: ${tx.customerName}`);
    if (tx.note) lines.push(`Note: ${tx.note}`);
    lines.push(`Split into ${tx.qrAmounts.length} UPI payment${tx.qrAmounts.length > 1 ? 's' : ''} (₹1,999 or below each) via BillBreak.`);
    return lines.join('\n');
  }

  async function shareReceipt(tx, method) {
    const text = buildReceiptText(tx);

    if (method === 'native' && navigator.share) {
      try {
        await navigator.share({ title: 'BillBreak Receipt', text });
        return;
      } catch (err) {
        // User cancelled the share sheet or it failed — fall through to
        // clipboard fallback below rather than leaving them stuck.
      }
    }

    if (method === 'whatsapp') {
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener');
      return;
    }

    // Fallback: copy to clipboard.
    try {
      await navigator.clipboard.writeText(text);
      BBToast.show('Receipt copied to clipboard');
    } catch (err) {
      BBToast.show('Could not share automatically — please copy manually', { type: 'error' });
    }
  }

  // ---- Export ----
  function exportCsv() {
    const rows = getFilteredTransactions();
    if (rows.length === 0) {
      BBToast.show('No transactions to export', { type: 'error' });
      return;
    }

    const header = ['Date', 'Time', 'Total Amount (INR)', 'Customer Name', 'Contact', 'Note', 'Number of QR Codes', 'QR Amounts'];
    const csvRows = [header.join(',')];

    rows.forEach((tx) => {
      const d = new Date(tx.createdAt);
      const dateStr = d.toLocaleDateString('en-IN');
      const timeStr = d.toLocaleTimeString('en-IN');
      const fields = [
        dateStr,
        timeStr,
        tx.totalAmount.toFixed(2),
        csvEscape(tx.customerName),
        csvEscape(tx.customerPhone),
        csvEscape(tx.note),
        String(tx.qrAmounts.length),
        csvEscape(tx.qrAmounts.map((a) => a.toFixed(2)).join(' | ')),
      ];
      csvRows.push(fields.join(','));
    });

    downloadFile(csvRows.join('\n'), `billbreak-transactions-${dateStamp()}.csv`, 'text/csv;charset=utf-8;');
    BBToast.show('CSV exported');
  }

  function csvEscape(value) {
    const str = String(value ?? '');
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function exportPdf() {
    const rows = getFilteredTransactions();
    if (rows.length === 0) {
      BBToast.show('No transactions to export', { type: 'error' });
      return;
    }

    // Build a minimal, valid, self-contained PDF using raw PDF syntax —
    // no external library needed, keeping the app dependency-free.
    const profile = BBStorage.getProfile();
    const pdfBlob = buildSimplePdf(rows, profile);
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billbreak-transactions-${dateStamp()}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    BBToast.show('PDF exported');
  }

  /**
   * Builds a simple, valid multi-line PDF report using the PDF text-object
   * primitives directly (Helvetica, one content stream). This avoids
   * pulling in a PDF library and keeps BillBreak dependency-free, at the
   * cost of only supporting plain left-aligned monospaced-ish text rows —
   * more than sufficient for a transaction log.
   */
  function buildSimplePdf(rows, profile) {
    const lines = [];
    lines.push(`BillBreak - Transaction Report`);
    lines.push(`Business: ${profile.businessName || '-'}   UPI ID: ${profile.upiId || '-'}`);
    lines.push(`Generated: ${new Date().toLocaleString('en-IN')}`);
    lines.push('');
    rows.forEach((tx, i) => {
      const d = new Date(tx.createdAt);
      lines.push(`${i + 1}. ${d.toLocaleDateString('en-IN')} ${d.toLocaleTimeString('en-IN')}  Rs.${tx.totalAmount.toFixed(2)}  ${tx.customerName || 'Walk-in'}  (${tx.qrAmounts.length} QR)`);
    });

    const pageWidth = 595.28; // A4 points
    const pageHeight = 841.89;
    const marginLeft = 48;
    let cursorY = pageHeight - 60;
    const lineHeight = 16;

    const pages = [];
    let currentPageLines = [];

    lines.forEach((line) => {
      if (cursorY < 60) {
        pages.push(currentPageLines);
        currentPageLines = [];
        cursorY = pageHeight - 60;
      }
      currentPageLines.push({ text: line, y: cursorY });
      cursorY -= lineHeight;
    });
    if (currentPageLines.length) pages.push(currentPageLines);

    return assemblePdf(pages, pageWidth, pageHeight, marginLeft);
  }

  function pdfEscapeText(str) {
    return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  function assemblePdf(pages, pageWidth, pageHeight, marginLeft) {
    const objects = [];
    const contentObjIds = [];

    pages.forEach((pageLines) => {
      let stream = 'BT /F1 11 Tf\n';
      pageLines.forEach(({ text, y }) => {
        stream += `1 0 0 1 ${marginLeft} ${y.toFixed(2)} Tm (${pdfEscapeText(text)}) Tj\n`;
      });
      stream += 'ET';
      contentObjIds.push({ stream });
    });

    // Object numbering: 1 = Catalog, 2 = Pages, 3 = Font,
    // then page objects and content-stream objects interleaved.
    let objNum = 4;
    const pageObjIds = [];
    const contentIds = [];

    contentObjIds.forEach(() => {
      pageObjIds.push(objNum++);
      contentIds.push(objNum++);
    });

    const kids = pageObjIds.map((id) => `${id} 0 R`).join(' ');

    objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
    objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageObjIds.length} >>\nendobj\n`);
    objects.push(`3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

    pageObjIds.forEach((pageId, i) => {
      const contentId = contentIds[i];
      objects.push(
        `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`
      );
      const streamText = contentObjIds[i].stream;
      objects.push(`${contentId} 0 obj\n<< /Length ${streamText.length} >>\nstream\n${streamText}\nendstream\nendobj\n`);
    });

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((obj) => {
      offsets.push(pdf.length);
      pdf += obj;
    });

    const xrefStart = pdf.length;
    const totalObjs = objects.length + 1;
    pdf += `xref\n0 ${totalObjs}\n0000000000 65535 f \n`;
    for (let i = 1; i < totalObjs; i++) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return new Blob([pdf], { type: 'application/pdf' });
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function dateStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  function openExportMenu() {
    const root = document.getElementById('modal-root');
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = `
      <div class="modal-sheet" role="dialog" aria-labelledby="export-title">
        <div class="modal-sheet__handle"></div>
        <div class="modal-sheet__header">
          <h2 id="export-title">Export transactions</h2>
          <button class="topbar__action" id="close-export-btn" aria-label="Close" type="button">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
        <div class="stack-4">
          <button class="settings-list-item" id="export-csv-btn" type="button" style="border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:var(--sp-4);">
            <span class="icon-badge" style="background:var(--color-primary-tint); color:var(--color-primary);"><i class="fa-solid fa-file-csv" aria-hidden="true"></i></span>
            <span class="item-label">Export as CSV</span>
            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
          </button>
          <button class="settings-list-item" id="export-pdf-btn" type="button" style="border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:var(--sp-4);">
            <span class="icon-badge" style="background:var(--color-danger-soft); color:var(--color-danger);"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i></span>
            <span class="item-label">Export as PDF</span>
            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `;
    root.appendChild(overlay);

    const close = () => {
      overlay.classList.add('is-closing');
      overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
    };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#close-export-btn').addEventListener('click', close);
    overlay.querySelector('#export-csv-btn').addEventListener('click', () => { exportCsv(); close(); });
    overlay.querySelector('#export-pdf-btn').addEventListener('click', () => { exportPdf(); close(); });
  }

  function handleChipClick(chip) {
    els.chips.forEach((c) => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    activeRange = chip.dataset.range;
    els.customPanel.hidden = activeRange !== 'custom';
    render();
  }

  function init() {
    cacheEls();

    els.searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.trim();
      render();
    });

    els.chips.forEach((chip) => {
      chip.addEventListener('click', () => handleChipClick(chip));
    });

    els.dateFrom.addEventListener('change', (e) => { customFrom = e.target.value; render(); });
    els.dateTo.addEventListener('change', (e) => { customTo = e.target.value; render(); });

    els.exportBtn.addEventListener('click', openExportMenu);

    render();
  }

  return { init, refresh: render };
})();
