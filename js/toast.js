/**
 * toast.js
 * -----------------------------------------------------------------------
 * Lightweight toast notifications for confirmations and errors.
 * Announced via aria-live region for screen reader users.
 * -----------------------------------------------------------------------
 */

const BBToast = (() => {
  const region = document.getElementById('toast-region');
  const DEFAULT_DURATION = 3200;

  function show(message, { type = 'success', duration = DEFAULT_DURATION } = {}) {
    if (!region) return;

    const toast = document.createElement('div');
    toast.className = `toast${type === 'error' ? ' toast-error' : ''}`;
    toast.setAttribute('role', 'status');

    const icon = document.createElement('i');
    icon.className = type === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check';
    icon.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    region.appendChild(toast);

    const remove = () => {
      toast.classList.add('is-leaving');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    };

    setTimeout(remove, duration);
  }

  return { show };
})();
