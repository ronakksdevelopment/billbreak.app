/**
 * navigation.js
 * -----------------------------------------------------------------------
 * Bottom tab bar navigation between the three main screens. QR Splitter
 * ("splitter") is the default home screen.
 * -----------------------------------------------------------------------
 */

const BBNavigation = (() => {
  const TAB_CONFIG = {
    transactions: { screenId: 'screen-transactions', title: 'Transactions' },
    splitter: { screenId: 'screen-splitter', title: 'BillBreak' },
    settings: { screenId: 'screen-settings', title: 'Settings' },
  };

  const els = {};

  function cacheEls() {
    els.tabButtons = Array.from(document.querySelectorAll('.tabbar__item'));
    els.screens = Array.from(document.querySelectorAll('#main-content > section'));
    els.pageTitleText = document.getElementById('page-title-text');
  }

  function goToTab(tabName) {
    const config = TAB_CONFIG[tabName];
    if (!config) return;

    els.tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('is-active', isActive);
      if (isActive) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });

    els.screens.forEach((screen) => {
      screen.hidden = screen.id !== config.screenId;
    });

    els.pageTitleText.textContent = config.title;

    // Refresh dynamic content on entering certain tabs.
    if (tabName === 'transactions' && typeof BBTransactions !== 'undefined') {
      BBTransactions.refresh();
    }
    if (tabName === 'settings' && typeof BBSettings !== 'undefined') {
      BBSettings.refreshProfileCard();
    }
  }

  function init() {
    cacheEls();
    els.tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => goToTab(btn.dataset.tab));
    });
    goToTab('splitter');
  }

  return { init, goToTab };
})();
