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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>,
)
