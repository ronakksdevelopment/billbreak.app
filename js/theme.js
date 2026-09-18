/**
 * theme.js
 * -----------------------------------------------------------------------
 * Light/dark theme management. Persists the user's explicit choice to
 * localStorage; if no explicit choice has been made yet, follows the
 * OS-level prefers-color-scheme setting and keeps listening for changes.
 * -----------------------------------------------------------------------
 */

const BBTheme = (() => {
  const root = document.documentElement;
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme === 'dark' ? '#0A121F' : '#123B84');
    }
    updateToggleIcon(theme);
    updateSettingsSwitch(theme);
  }

  function updateToggleIcon(theme) {
    const btn = document.getElementById('theme-toggle-topbar-btn');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (!icon) return;
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  function updateSettingsSwitch(theme) {
    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle) toggle.checked = theme === 'dark';
  }

  function getEffectiveTheme() {
    const stored = BBStorage.getTheme();
    if (stored === 'light' || stored === 'dark') return stored;
    return mediaQuery.matches ? 'dark' : 'light';
  }

  function init() {
    applyTheme(getEffectiveTheme());

    // If the user hasn't made an explicit choice, keep following the OS.
    mediaQuery.addEventListener('change', (e) => {
      if (!BBStorage.getTheme()) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  function toggle() {
    const current = getEffectiveTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    BBStorage.setTheme(next);
    applyTheme(next);
  }

  function setExplicit(theme) {
    BBStorage.setTheme(theme);
    applyTheme(theme);
  }

  return { init, toggle, setExplicit, getEffectiveTheme };
})();
