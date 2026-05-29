// Ambient declaration for the Telegram WebApp global injected by
// https://telegram.org/js/telegram-web-app.js. Loose typing — the @twa-dev/sdk
// import gives stricter shapes for code that goes through it.
import type WebApp from '@twa-dev/sdk';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: typeof WebApp;
    };
  }
}

export {};
