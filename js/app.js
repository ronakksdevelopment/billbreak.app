/**
 * app.js
 * -----------------------------------------------------------------------
 * Application bootstrap. Decides whether to show onboarding/setup or the
 * main app on load, initializes all screen controllers, registers the
 * service worker for offline support, and wires the topbar theme toggle.
 * -----------------------------------------------------------------------
 */

const BBApp = (() => {
  function enterMainApp() {
    document.getElementById('onboarding-screen').hidden = true;
    document.getElementById('setup-screen').hidden = true;
    document.getElementById('main-app').hidden = false;

    BBSplitterUI.init();
    BBTransactions.init();
    BBSettings.init();
    BBNavigation.init();
  }

  function initThemeToggleButton() {
    const btn = document.getElementById('theme-toggle-topbar-btn');
    if (btn) {
      btn.addEventListener('click', () => BBTheme.toggle());
    }
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch((err) => {
          console.error('Service worker registration failed:', err);
        });
      });
    }
  }

  function init() {
    BBTheme.init();
    initThemeToggleButton();
    registerServiceWorker();

    const needsOnboarding = BBOnboarding.init();

    if (!needsOnboarding) {
      enterMainApp();
    }
  }

  return { init, enterMainApp };
})();

document.addEventListener('DOMContentLoaded', BBApp.init);
