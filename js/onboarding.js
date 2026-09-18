/**
 * onboarding.js
 * -----------------------------------------------------------------------
 * Controls the first-launch onboarding carousel and the subsequent
 * business-name / UPI-ID setup form. Runs only once per device; both
 * "done" flags are persisted via BBStorage.
 * -----------------------------------------------------------------------
 */

const BBOnboarding = (() => {
  let currentSlide = 0;
  const TOTAL_SLIDES = 3;

  const els = {};

  function cacheEls() {
    els.onboardingScreen = document.getElementById('onboarding-screen');
    els.setupScreen = document.getElementById('setup-screen');
    els.slides = Array.from(document.querySelectorAll('.onboarding__slide'));
    els.dots = Array.from(document.querySelectorAll('.onboarding__dot'));
    els.nextBtn = document.getElementById('onboarding-next-btn');
    els.nextLabel = document.getElementById('onboarding-next-label');
    els.skipBtn = document.getElementById('onboarding-skip-btn');
    els.setupForm = document.getElementById('setup-form');
    els.businessNameInput = document.getElementById('setup-business-name');
    els.upiIdInput = document.getElementById('setup-upi-id');
  }

  function goToSlide(index) {
    currentSlide = Math.max(0, Math.min(TOTAL_SLIDES - 1, index));
    els.slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === currentSlide);
    });
    els.dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === currentSlide);
      dot.setAttribute('aria-selected', i === currentSlide ? 'true' : 'false');
    });
    els.nextLabel.textContent = currentSlide === TOTAL_SLIDES - 1 ? "Let's go" : 'Next';
    const icon = els.nextBtn.querySelector('i');
    if (icon) {
      icon.className = currentSlide === TOTAL_SLIDES - 1 ? 'fa-solid fa-check' : 'fa-solid fa-arrow-right';
    }
  }

  function handleNext() {
    if (currentSlide < TOTAL_SLIDES - 1) {
      goToSlide(currentSlide + 1);
    } else {
      finishOnboarding();
    }
  }

  function finishOnboarding() {
    BBStorage.setOnboardingDone();
    showSetupScreen();
  }

  function showOnboardingScreen() {
    els.onboardingScreen.hidden = false;
    els.setupScreen.hidden = true;
    goToSlide(0);
  }

  function showSetupScreen() {
    els.onboardingScreen.hidden = true;
    els.setupScreen.hidden = false;
    els.businessNameInput.focus();
  }

  function validateSetupForm() {
    let valid = true;

    const nameField = els.businessNameInput.closest('.field');
    const name = els.businessNameInput.value.trim();
    if (!name) {
      nameField.classList.add('has-error');
      valid = false;
    } else {
      nameField.classList.remove('has-error');
    }

    const upiField = els.upiIdInput.closest('.field');
    const upi = els.upiIdInput.value.trim();
    if (!BBUpi.isValidUpiId(upi)) {
      upiField.classList.add('has-error');
      valid = false;
    } else {
      upiField.classList.remove('has-error');
    }

    return valid;
  }

  function handleSetupSubmit(e) {
    e.preventDefault();
    if (!validateSetupForm()) return;

    const businessName = els.businessNameInput.value.trim();
    const upiId = els.upiIdInput.value.trim();

    BBStorage.saveProfile({ businessName, upiId });
    BBStorage.setSetupDone();

    BBApp.enterMainApp();
  }

  function init() {
    cacheEls();

    els.nextBtn.addEventListener('click', handleNext);
    els.skipBtn.addEventListener('click', finishOnboarding);
    els.dots.forEach((dot, i) => {
      dot.addEventListener('click', () => goToSlide(i));
    });
    els.setupForm.addEventListener('submit', handleSetupSubmit);

    // Clear inline validation errors as the user types.
    els.businessNameInput.addEventListener('input', () => {
      els.businessNameInput.closest('.field').classList.remove('has-error');
    });
    els.upiIdInput.addEventListener('input', () => {
      els.upiIdInput.closest('.field').classList.remove('has-error');
    });

    // Decide what to show on load.
    if (!BBStorage.isSetupDone()) {
      if (!BBStorage.isOnboardingDone()) {
        showOnboardingScreen();
      } else {
        showSetupScreen();
      }
      return true; // signals app.js that onboarding/setup is active
    }
    return false;
  }

  return { init, showSetupScreen };
})();
