/**
 * splitter-logic.js
 * -----------------------------------------------------------------------
 * The core bill-splitting algorithm. Given a total amount, produces the
 * minimum number of parts such that every part is <= MAX_PART_AMOUNT
 * (₹1,999), with the total split as evenly as possible across parts.
 *
 * Approach:
 *  1. n = ceil(total / MAX_PART_AMOUNT) is the minimum number of parts
 *     that can possibly keep every part at or below the cap.
 *  2. Divide total by n. Because money should be split to the paise
 *     (2 decimal places) and paise are indivisible, we compute the split
 *     in integer paise, distributing any leftover paise one-by-one across
 *     the first parts so amounts differ by at most 1 paise (i.e. as even
 *     as mathematically possible) and the parts always sum exactly to
 *     the original total (no rounding drift).
 * -----------------------------------------------------------------------
 */

const BBSplitter = (() => {
  const MAX_PART_AMOUNT = 1999; // rupees — the UPI merchant-fee-free ceiling
  const MIN_TOTAL = 0.01;

  /**
   * @param {number} totalRupees - total bill amount in rupees (may have paise)
   * @returns {{ parts: number[], count: number, error: string|null }}
   *   parts: array of amounts in rupees (2 decimal precision), length = count
   */
  function splitBill(totalRupees) {
    const total = Number(totalRupees);

    if (!Number.isFinite(total) || total < MIN_TOTAL) {
      return { parts: [], count: 0, error: 'Enter an amount greater than ₹0' };
    }

    // Work in integer paise throughout to avoid floating-point drift.
    const totalPaise = Math.round(total * 100);
    const maxPartPaise = MAX_PART_AMOUNT * 100;

    const count = Math.ceil(totalPaise / maxPartPaise) || 1;

    const basePaise = Math.floor(totalPaise / count);
    let remainder = totalPaise - basePaise * count;

    const partsPaise = new Array(count).fill(basePaise);
    // Distribute the leftover paise one at a time so amounts differ by
    // at most 1 paise from each other — the most even split possible.
    for (let i = 0; i < count && remainder > 0; i++, remainder--) {
      partsPaise[i] += 1;
    }

    const parts = partsPaise.map((p) => Math.round(p) / 100);

    return { parts, count, error: null };
  }

  return {
    MAX_PART_AMOUNT,
    splitBill,
  };
})();
