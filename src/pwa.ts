// Service worker registration for non-Telegram clients.
//
// Inside the Telegram WebView the SW lifecycle is unreliable (the host
// can clear storage at any time, multiple WebApp opens share the same
// origin in unpredictable ways, and there is no install-prompt surface).
// Skipping registration there means Telegram users get a perfectly
// functional SPA with no broken offline state, while everyone else gets
// the installable PWA experience.

import { registerSW } from 'virtual:pwa-register';

const isTelegramHost = (): boolean => {
  if (typeof window === 'undefined') return false;
  const tg = window.Telegram?.WebApp;
  if (!tg) return false;
  // tg.platform is 'unknown' when the page is opened in a normal browser
  // even with the telegram-web-app.js script loaded.
  return typeof tg.platform === 'string' && tg.platform !== 'unknown';
};

export const registerPwa = (): void => {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (isTelegramHost()) return;

  registerSW({
    immediate: true,
    onRegisterError(err) {
      // Don't bubble — a missing/blocked SW must never break the app.
      if (import.meta.env.DEV) console.warn('[pwa] SW register failed:', err);
    },
  });
};
