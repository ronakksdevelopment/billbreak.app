/**
 * storage.js
 * -----------------------------------------------------------------------
 * All client-side data persistence for BillBreak. Uses localStorage
 * exclusively (no backend, no external database). Every read/write is
 * wrapped in try/catch since localStorage can throw in private-browsing
 * modes or when storage quota is exceeded.
 *
 * Keys are namespaced under "billbreak:" to avoid collisions with any
 * other app that might share the same origin (e.g. on GitHub Pages
 * subpaths).
 * -----------------------------------------------------------------------
 */

const BBStorage = (() => {
  const KEYS = {
    ONBOARDING_DONE: 'billbreak:onboardingDone',
    SETUP_DONE: 'billbreak:setupDone',
    BUSINESS_NAME: 'billbreak:businessName',
    UPI_ID: 'billbreak:upiId',
    DEFAULT_AMOUNT: 'billbreak:defaultAmount',
    THEME: 'billbreak:theme',
    TRANSACTIONS: 'billbreak:transactions',
  };

  /** Safely read a raw string value from localStorage. */
  function getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      console.error('BBStorage.getItem failed for', key, err);
      return null;
    }
  }

  /** Safely write a raw string value to localStorage. Returns success boolean. */
  function setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (err) {
      console.error('BBStorage.setItem failed for', key, err);
      return false;
    }
  }

  function removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (err) {
      console.error('BBStorage.removeItem failed for', key, err);
    }
  }

  // ---- Onboarding / setup flags ----
  function isOnboardingDone() {
    return getItem(KEYS.ONBOARDING_DONE) === 'true';
  }
  function setOnboardingDone() {
    setItem(KEYS.ONBOARDING_DONE, 'true');
  }
  function isSetupDone() {
    return getItem(KEYS.SETUP_DONE) === 'true';
  }
  function setSetupDone() {
    setItem(KEYS.SETUP_DONE, 'true');
  }

  // ---- Business profile ----
  function getProfile() {
    return {
      businessName: getItem(KEYS.BUSINESS_NAME) || '',
      upiId: getItem(KEYS.UPI_ID) || '',
      defaultAmount: getItem(KEYS.DEFAULT_AMOUNT) || '',
    };
  }

  function saveProfile({ businessName, upiId, defaultAmount }) {
    if (typeof businessName === 'string') setItem(KEYS.BUSINESS_NAME, businessName.trim());
    if (typeof upiId === 'string') setItem(KEYS.UPI_ID, upiId.trim());
    if (defaultAmount === null || defaultAmount === undefined || defaultAmount === '') {
      removeItem(KEYS.DEFAULT_AMOUNT);
    } else {
      setItem(KEYS.DEFAULT_AMOUNT, String(defaultAmount));
    }
  }

  // ---- Theme ----
  function getTheme() {
    return getItem(KEYS.THEME); // 'light' | 'dark' | null (null = follow system)
  }
  function setTheme(theme) {
    setItem(KEYS.THEME, theme);
  }

  // ---- Transactions ----
  /**
   * A transaction record shape:
   * {
   *   id: string (uuid-ish),
   *   createdAt: number (epoch ms),
   *   totalAmount: number,
   *   customerName: string | '',
   *   customerPhone: string | '',
   *   note: string | '',
   *   upiId: string,
   *   businessName: string,
   *   qrAmounts: number[],   // each individual split amount
   *   confirmedCount: number // how many of the QR codes were marked as paid
   * }
   */
  function getTransactions() {
    const raw = getItem(KEYS.TRANSACTIONS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Failed to parse stored transactions', err);
      return [];
    }
  }

  function saveTransactions(list) {
    return setItem(KEYS.TRANSACTIONS, JSON.stringify(list));
  }

  function addTransaction(tx) {
    const list = getTransactions();
    list.unshift(tx); // newest first
    saveTransactions(list);
    return list;
  }

  function deleteTransaction(id) {
    const list = getTransactions().filter((t) => t.id !== id);
    saveTransactions(list);
    return list;
  }

  function updateTransaction(id, patch) {
    const list = getTransactions();
    const idx = list.findIndex((t) => t.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...patch };
      saveTransactions(list);
    }
    return list;
  }

  function clearAllData() {
    Object.values(KEYS).forEach(removeItem);
  }

  function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    // Fallback for browsers without crypto.randomUUID
    return 'tx-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  return {
    KEYS,
    isOnboardingDone,
    setOnboardingDone,
    isSetupDone,
    setSetupDone,
    getProfile,
    saveProfile,
    getTheme,
    setTheme,
    getTransactions,
    saveTransactions,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    clearAllData,
    generateId,
  };
})();
