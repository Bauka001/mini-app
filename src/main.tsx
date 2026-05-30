import './polyfills';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/i18n.ts';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { bootstrapTelegram, isTelegramHost } from './telegram/bootstrap';
import { registerPwa } from './pwa';
import telegramAnalytics from '@telegram-apps/analytics';

bootstrapTelegram();
registerPwa();

// === Chunk-load self-healer ==================================================
// After a deploy, the index.html the user has cached in Telegram WebView still
// references the previous build's chunk hashes (e.g. /assets/Shop-DsHpx8cu.js).
// When they navigate to a route whose chunk was renamed, the dynamic import()
// 404s and the <Suspense fallback> hangs on the blue theme background forever.
//
// Catch the chunk-load failure globally (works for both unhandled promise
// rejections from React.lazy() and ad-hoc dynamic imports). On detection, bust
// caches the same way the watchdog does and hard-reload with a cache-buster
// so Vercel serves the fresh index.html with the right chunk references.
//
// Bounded by sessionStorage so a permanently broken bundle can't reload-storm.
{
  const RELOAD_KEY = 'focus-chunk-reload-attempts';
  const MAX_RELOADS = 2;

  const looksLikeChunkLoadError = (err: unknown): boolean => {
    if (!err) return false;
    const msg = String((err as { message?: string })?.message || err);
    return (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('error loading dynamically imported') ||
      msg.includes('ChunkLoadError') ||
      /Loading chunk \d+ failed/.test(msg)
    );
  };

  const recover = async () => {
    let attempts = 0;
    try { attempts = parseInt(sessionStorage.getItem(RELOAD_KEY) || '0', 10) || 0; } catch { /* noop */ }
    if (attempts >= MAX_RELOADS) {
      console.error('[chunk-healer] giving up after', attempts, 'reloads — bundle may be broken');
      return;
    }
    try { sessionStorage.setItem(RELOAD_KEY, String(attempts + 1)); } catch { /* noop */ }
    console.warn('[chunk-healer] chunk load failed — purging caches + reloading');
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch { /* noop */ }
    const url = new URL(window.location.href);
    url.searchParams.set('_cb', String(Date.now()));
    window.location.replace(url.toString());
  };

  window.addEventListener('error', (e) => {
    if (looksLikeChunkLoadError(e.error || e.message)) void recover();
  });
  window.addEventListener('unhandledrejection', (e) => {
    if (looksLikeChunkLoadError(e.reason)) void recover();
  });

  // Clear the reload counter once a fresh navigation succeeded (no chunk
  // error fires in the first 8s) — so a future chunk-mismatch deploy still
  // gets its full quota.
  setTimeout(() => {
    try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* noop */ }
  }, 8000);
}

// Telegram Mini Apps Analytics SDK — required by the Apps Center moderation
// pipeline. Skipped outside Telegram (analytics service rejects non-WebApp
// hosts) and when no token is provided so local dev keeps working.
const analyticsToken = import.meta.env.VITE_TG_ANALYTICS_TOKEN as string | undefined;
const analyticsAppName = (import.meta.env.VITE_TG_ANALYTICS_APP_NAME as string | undefined) || 'focus_game';
if (analyticsToken && isTelegramHost()) {
  telegramAnalytics
    .init({ token: analyticsToken, appName: analyticsAppName })
    .catch((err) => {
      if (import.meta.env.DEV) {
        console.warn('[tg-analytics] init failed:', err);
      }
    });
}

const rootEl = document.getElementById('root')!;

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>,
)

// Self-healing watchdog. If we got this far the bundle parsed and ReactDOM.render
// was called — but a stuck Telegram WebView (cached HTML referencing dead asset
// hashes, half-installed SW, broken zustand persist payload, etc.) can leave
// `#root` empty for the entire session, presenting users with a blank cream
// screen they can't escape. Instead of asking them to clear data manually,
// detect the empty-render state and self-repair: unregister all SWs, drop every
// cache, then hard reload bypassing the cache. Bounded by a session-scoped
// attempt counter so we can never loop forever.
{
  const ATTEMPT_KEY = 'focus-watchdog-attempts';
  const MAX_ATTEMPTS = 3;
  const TIMEOUT_MS = 5000;

  const getAttempts = (): number => {
    try {
      return parseInt(sessionStorage.getItem(ATTEMPT_KEY) || '0', 10) || 0;
    } catch {
      return 0;
    }
  };

  const incAttempts = (n: number) => {
    try {
      sessionStorage.setItem(ATTEMPT_KEY, String(n));
    } catch {
      /* sessionStorage unavailable — give up rather than loop */
    }
  };

  // childElementCount alone isn't enough — a Layout that renders its cream
  // wrapper but mounts an empty <Outlet /> still counts as 1 child, but to
  // the user it's a blank screen. Use textContent length as a stronger signal
  // that the app actually rendered useful UI.
  const isVisuallyEmpty = () => {
    const text = (rootEl.textContent || '').trim();
    return rootEl.childElementCount === 0 || text.length < 10;
  };

  // Successful render → clear the counter so a future stuck state still gets
  // its full quota.
  setTimeout(() => {
    if (!isVisuallyEmpty() && getAttempts() > 0) {
      try { sessionStorage.removeItem(ATTEMPT_KEY); } catch { /* noop */ }
    }
  }, TIMEOUT_MS + 1000);

  setTimeout(async () => {
    if (!isVisuallyEmpty()) return;

    const attempts = getAttempts();
    if (attempts >= MAX_ATTEMPTS) {
      // We've already auto-recovered enough — leaving further loops to the
      // user prevents a retry storm if the bundle itself is permanently
      // broken on this device.
      console.error('[watchdog] empty render after', attempts, 'attempts — giving up');
      return;
    }

    const nextAttempt = attempts + 1;
    incAttempts(nextAttempt);
    console.warn('[watchdog] empty render after', TIMEOUT_MS, 'ms — purging (attempt', nextAttempt, ')');

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
      console.warn('[watchdog] cache purge failed:', err);
    }

    // On the second attempt also drop persisted app state — covers the case
    // where a corrupted zustand payload (interrupted write, schema drift)
    // is what's preventing render. Consent flag is preserved so the user
    // doesn't have to re-tick the boxes after a crash recovery.
    if (nextAttempt >= 2) {
      try {
        const consent = localStorage.getItem('focus-consent-v1');
        Object.keys(localStorage)
          .filter((k) => k.startsWith('focus-app-') || k.startsWith('focus-onboarding-'))
          .forEach((k) => localStorage.removeItem(k));
        if (consent) localStorage.setItem('focus-consent-v1', consent);
      } catch (err) {
        console.warn('[watchdog] localStorage reset failed:', err);
      }
    }

    // Append a cache-buster so Telegram's WebView (which sometimes ignores
    // cache-control on the HTML doc) is forced to fetch fresh.
    const url = new URL(window.location.href);
    url.searchParams.set('_r', String(Date.now()));
    window.location.replace(url.toString());
  }, TIMEOUT_MS);
}
