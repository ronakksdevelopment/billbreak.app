/**
 * upi.js
 * -----------------------------------------------------------------------
 * Helpers for validating UPI IDs and building standard UPI deep links.
 * BillBreak never contacts any payment network — it only constructs the
 * same "upi://pay?..." URI that any UPI app already knows how to open.
 * -----------------------------------------------------------------------
 */

const BBUpi = (() => {
  // Basic UPI VPA shape: localpart@handle. Real-world handles vary widely
  // (bank short codes, PSP names), so we validate structure, not the handle
  // against a fixed whitelist.
  const UPI_ID_PATTERN = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/;

  function isValidUpiId(value) {
    if (typeof value !== 'string') return false;
    return UPI_ID_PATTERN.test(value.trim());
  }

  /**
   * Build a standard UPI deep link.
   * Format: upi://pay?pa=UPIID&am=AMOUNT&pn=NAME&tn=NOTE
   * All values are URI-encoded. Amount is always formatted to 2 decimals
   * as most UPI apps expect a fixed-point value.
   */
  function buildUpiLink({ payeeUpiId, amount, payeeName, note }) {
    const params = new URLSearchParams();
    params.set('pa', payeeUpiId);
    params.set('pn', payeeName || 'BillBreak Merchant');
    params.set('am', Number(amount).toFixed(2));
    params.set('cu', 'INR');
    if (note) {
      params.set('tn', note);
    }
    return `upi://pay?${params.toString()}`;
  }

  return {
    isValidUpiId,
    buildUpiLink,
  };
})();
