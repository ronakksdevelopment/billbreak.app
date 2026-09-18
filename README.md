# BillBreak

**A free, offline-capable Progressive Web App that helps Indian businesses split bills into UPI-compliant QR codes.**

From **15 October 2026**, UPI payments to merchants above ₹2,000 carry a 0.4% Merchant Discount Rate (MDR), deducted from what the business receives. BillBreak helps merchants stay comfortably compliant by splitting any total bill into the **minimum number of separate UPI QR codes**, each kept at or below **₹1,999**, split as evenly as possible — completely free, with no percentage charged and no backend server involved.

> BillBreak does not process payments, hold funds, or verify transactions. Every QR code is a standard `upi://pay` deep link generated entirely on the merchant's own device — the customer's UPI app handles payment exactly as it always has.

---

## ✨ Features

- **Onboarding & setup** — a first-launch welcome carousel explaining the ₹2,000 rule and how BillBreak helps, followed by a one-time business name + UPI ID setup.
- **QR Splitter (home tab)** — enter a total bill amount and instantly get the fewest possible UPI QR codes, each ≤ ₹1,999, split evenly to the paisa with no rounding drift. Each QR code has the BillBreak logo overlaid at the center (using error-correction level H, so the code stays fully scannable). An animated success checkmark confirms each code as "paid" (locally tracked only — no backend verification).
- **Recent Transactions tab** — full history with date/time, amount, optional customer name & contact number. Includes search, filter by date range (today / this week / this month / custom range) or by name/amount, swipe-to-delete, and per-transaction receipt sharing via WhatsApp or the Web Share API.
- **Export** — transaction history as **CSV** or a self-generated **PDF** report, entirely client-side (no libraries, no server).
- **Settings & Profile tab** — edit business name, UPI ID, and an optional default bill amount; toggle light/dark mode (persisted); a full About section explaining the ₹2,000 rule and BillBreak's free, no-fee model; app version display; full data export/clear.
- **Light & dark themes** — a rich fintech palette (deep blue primary, green for success, amber accent), fully toggle-able and persisted, and otherwise following the device's OS theme by default.
- **Micro-animations** — tab transitions, QR reveal animation, animated success checkmark (SVG stroke-draw), button press ripple feedback, and skeleton loading states.
- **Friendly empty states** — no blank screens; every list (transactions, search results) has a custom illustrated empty state.
- **Fully offline-capable PWA** — a complete `manifest.json` and `service-worker.js` precache the entire app shell (HTML, CSS, JS, fonts, icons, the QR library) so BillBreak keeps working with zero network connection once opened and installed.
- **Zero backend, zero external API calls at runtime** — all data (business profile, UPI ID, transaction history) is stored entirely in the browser's `localStorage`. Fonts, icons, and the QR-code library are all self-hosted inside the repo rather than loaded from a CDN, so nothing ever needs to leave the device.
- **Accessible** — semantic HTML, ARIA labels on icon-only buttons and live regions, visible keyboard focus states, and `prefers-reduced-motion` support.

---

## 🧮 The splitting algorithm

Given a total bill `T`:

1. Compute the minimum number of parts `n = ceil(T / 1999)`.
2. Divide `T` by `n` in **integer paise** (not floating-point rupees) to avoid rounding drift.
3. Distribute any leftover paise one at a time across the first few parts, so every part is within **1 paisa** of every other part — the mathematically most even split possible — while the parts always sum back to exactly `T`.

Example: a ₹5,000 bill becomes 3 QR codes of ₹1,666.67 / ₹1,666.67 / ₹1,666.66 — each safely under the ₹2,000 threshold, summing exactly to ₹5,000.00.

---

## 🛠 Tech stack

- **HTML5** — semantic markup throughout.
- **CSS3** — hand-written, no framework. CSS custom properties drive a full light/dark theming system.
- **Vanilla JavaScript (ES6+)** — no frameworks, no build step. Code is split into small, single-responsibility modules under `js/`.
- **[qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)** by Kazuhiko Arase (MIT licensed) — the only third-party *code* dependency, vendored locally (`js/vendor/qrcode.min.js`) so QR generation works fully offline with no CDN call.
- **Inter** and **Poppins** — self-hosted web fonts (SIL OFL 1.1).
- **Font Awesome Free** — self-hosted icon font (see `assets/fontawesome/LICENSE.txt` for the mixed CC BY / OFL / MIT licensing of its components).
- **`localStorage`** — all persistence.
- **Service Worker + Web App Manifest** — installability and full offline support.

No React, no Vue, no bundler, no package.json required to run the app — it is plain static files.

---

## 📁 Project structure

```
billbreak/
├── index.html                  # Single-page app shell (onboarding, setup, main app)
├── manifest.json                # PWA manifest
├── service-worker.js            # Offline caching (cache-first app shell)
├── LICENSE                      # MIT license (+ third-party asset licenses)
├── .gitignore
├── README.md
│
├── css/
│   ├── variables.css            # Design tokens: colors, type, spacing, motion (light+dark themes)
│   ├── base.css                 # Reset, typography, base app-shell layout
│   ├── components.css           # Buttons, cards, forms, tab bar, toasts, modals, skeletons
│   ├── onboarding.css           # Onboarding carousel + setup form screens
│   ├── splitter.css             # QR Splitter (home) screen + success-check animation
│   ├── transactions.css         # Recent Transactions screen
│   └── settings.css             # Settings & Profile screen
│
├── js/
│   ├── vendor/
│   │   └── qrcode.min.js        # Vendored qrcode-generator (MIT) — offline QR rendering
│   ├── storage.js                # localStorage persistence layer
│   ├── upi.js                    # UPI ID validation + upi://pay link builder
│   ├── splitter-logic.js         # The bill-splitting algorithm
│   ├── theme.js                  # Light/dark theme handling
│   ├── toast.js                  # Toast notifications
│   ├── onboarding.js             # First-launch onboarding + setup flow
│   ├── qr-render.js               # Canvas QR rendering with logo overlay
│   ├── splitter-ui.js             # QR Splitter screen controller
│   ├── transactions.js            # Transactions screen: search/filter/export/share/delete
│   ├── settings.js                # Settings screen controller
│   ├── navigation.js              # Bottom tab-bar navigation
│   └── app.js                     # App bootstrap / entry point
│
└── assets/
    ├── icons/                    # App icons in all required PWA sizes + favicons
    ├── fonts/                    # Self-hosted Inter + Poppins (woff2) + their licenses
    └── fontawesome/               # Self-hosted Font Awesome Free (css + woff2 + license)
```

---

## 💻 Local setup

BillBreak has **no build step and no dependencies to install**. You only need to serve the folder over HTTP (opening `index.html` directly via `file://` will not work correctly, because service workers and some fetch APIs require an HTTP origin).

### Option 1 — Python (built into most systems)

```bash
cd billbreak
python3 -m http.server 8080
```

Then open **http://localhost:8080** in your browser.

### Option 2 — Node.js

```bash
cd billbreak
npx serve .
```

### Option 3 — VS Code

Install the **Live Server** extension, right-click `index.html`, and choose **"Open with Live Server."**

On first load you'll see the onboarding screens, then a one-time setup form for your business name and UPI ID. After that, the QR Splitter tab is your home screen.

---

## 🚀 Deploying to GitHub Pages

1. **Create a new GitHub repository** and push this project to it:
   ```bash
   cd billbreak
   git init
   git add .
   git commit -m "Initial commit: BillBreak v1.0"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your repository on GitHub.
   - Click **Settings → Pages** (in the left sidebar).
   - Under **Build and deployment → Source**, select **"Deploy from a branch."**
   - Under **Branch**, select **`main`** and folder **`/ (root)`**, then click **Save**.

3. **Wait a minute or two.** GitHub will show a banner with your live URL, typically:
   ```
   https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
   ```

4. **Verify PWA install works:** open the live URL on a phone (or desktop Chrome/Edge) — you should see an "Install app" / "Add to Home Screen" prompt. Once installed, turn on airplane mode and confirm the app still opens and works.

> **Note on paths:** every asset reference in this project (CSS, JS, manifest icons, service-worker cache list) uses **relative paths** (`./`, `assets/...`, `css/...`), not absolute `/` paths — so the app works correctly whether it's hosted at a domain root or in a GitHub Pages subpath like `/YOUR_REPO_NAME/`.

---

## 🔒 Privacy & data

BillBreak stores everything — your business profile and every transaction — in your browser's `localStorage`, on your own device. Nothing is ever sent to a server, because BillBreak doesn't have one. Clearing your browser's site data for BillBreak (or using "Clear all data" in Settings) permanently deletes it, with no way to recover it, since there is no cloud copy.

---

## 📄 License

Released under the [MIT License](./LICENSE). Bundled third-party assets (the QR library, fonts, and icon font) keep their own original open-source licenses — see the `LICENSE` file and the `LICENSE`/`LICENSE.txt` files inside `assets/fonts/` and `assets/fontawesome/` for details.
