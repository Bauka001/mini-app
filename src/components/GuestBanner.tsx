import { useState } from 'react';
import WebApp from '@twa-dev/sdk';

const DISMISS_KEY = 'focus.guestBanner.dismissed';

const isBrowserGuest = (): boolean => {
  try {
    return !WebApp.initData;
  } catch {
    return true;
  }
};

const openInTelegram = () => {
  const url = 'https://t.me/Focus_game_bot?startapp';
  try {
    WebApp.openTelegramLink(url);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

export const GuestBanner = () => {
  const [hidden, setHidden] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  });

  if (hidden || !isBrowserGuest()) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* sessionStorage may be unavailable in private mode */
    }
    setHidden(true);
  };

  return (
    <div className="mx-4 mt-3 flex items-start gap-3 rounded-xl border border-blue-400/30 bg-blue-500/10 p-3 text-sm">
      <span className="text-lg leading-none">📱</span>
      <div className="flex-1 leading-snug">
        <p className="font-semibold">Browser mode</p>
        <p className="opacity-80">
          Progress saves on this device only. Open in Telegram to sync, see leaderboards, and unlock
          purchases.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={openInTelegram}
            className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-600"
          >
            Open in Telegram
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg px-3 py-1.5 text-xs font-medium opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestBanner;
