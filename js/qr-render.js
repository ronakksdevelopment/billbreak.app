/**
 * qr-render.js
 * -----------------------------------------------------------------------
 * Renders a UPI deep link into a scannable QR code on a <canvas>, with
 * the BillBreak logo overlaid and centered on top. Uses the vendored
 * qrcode-generator library (js/vendor/qrcode.min.js, MIT licensed,
 * bundled locally so the app works fully offline).
 *
 * A logo covering ~20-22% of the QR's area is safe at error-correction
 * level 'H' (30% recoverable), which is why 'H' is used here — it keeps
 * the code reliably scannable even with the branding on top.
 * -----------------------------------------------------------------------
 */

const BBQrRender = (() => {
  const LOGO_SRC = 'assets/icons/icon-192x192.png';
  const MODULE_PX = 8; // px per QR module before scaling to CSS size
  let cachedLogoImg = null;

  function loadLogo() {
    if (cachedLogoImg) return Promise.resolve(cachedLogoImg);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        cachedLogoImg = img;
        resolve(img);
      };
      img.onerror = reject;
      img.src = LOGO_SRC;
    });
  }

  /**
   * Draws a UPI QR code (with centered logo) onto the given canvas element.
   * @param {HTMLCanvasElement} canvas
   * @param {string} upiLink - the upi://pay?... deep link to encode
   */
  async function renderToCanvas(canvas, upiLink) {
    // Error-correction level H gives 30% redundancy, enough headroom to
    // safely cover the center with a logo without breaking scannability.
    const qr = qrcode(0, 'H');
    qr.addData(upiLink);
    qr.make();

    const moduleCount = qr.getModuleCount();
    const size = moduleCount * MODULE_PX;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    // White background (required — QR codes need light quiet zones/background
    // to scan reliably against any card background).
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#0F172A';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(col * MODULE_PX, row * MODULE_PX, MODULE_PX, MODULE_PX);
        }
      }
    }

    // Overlay the BillBreak logo, centered, on a white rounded backing
    // so it stays legible against the dark QR modules underneath it.
    try {
      const logo = await loadLogo();
      const logoSize = size * 0.22;
      const logoX = (size - logoSize) / 2;
      const logoY = (size - logoSize) / 2;
      const pad = logoSize * 0.12;

      // White backing plate with soft rounded corners.
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, logoX - pad, logoY - pad, logoSize + pad * 2, logoSize + pad * 2, 10);
      ctx.fill();

      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
    } catch (err) {
      // If the logo fails to load for any reason, the QR code itself is
      // still fully valid and scannable without it — fail silently.
      console.warn('BillBreak logo overlay could not be drawn:', err);
    }

    return canvas;
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  return { renderToCanvas };
})();
