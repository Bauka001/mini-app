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

// If the user previously visited this origin in a regular browser or installed
// the PWA, a service worker is registered for the origin. Skipping registerSW
// inside Telegram doesn't unregister it — the existing SW still controls every
// fetch in the WebView. After a deploy, hashed asset names in the new
// index.html no longer match what the SW precached, so module imports 404 and
// React mounts a blank tree. This was the cause of the "second launch =
// empty screen" bug. Tear it down hard whenever we detect Telegram.
const purgeServiceWorkers = async (): Promise<void> => {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[pwa] purge failed:', err);
  }
};

export const registerPwa = (): void => {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  if (isTelegramHost()) {
    void purgeServiceWorkers();
    return;
  }

  registerSW({
    immediate: true,
    onRegisterError(err) {
      // Don't bubble — a missing/blocked SW must never break the app.
      if (import.meta.env.DEV) console.warn('[pwa] SW register failed:', err);
    },
  });
};
