import WebApp from '@twa-dev/sdk';
import { trackAppVisit } from './adminApi';

/**
 * Records this app entry exactly once per page load. Works for everyone:
 *  - Telegram users → the server verifies initData and stores a 'tg:<id>' row.
 *  - Anonymous visitors (no id / opened outside Telegram) → we mint and persist
 *    a stable client UUID so they're still counted under 'anon:<uuid>'.
 *
 * Fully best-effort: any failure is swallowed so tracking can never break the app.
 */

const ANON_KEY = 'focus-anon-id';

function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    // localStorage unavailable (private mode) — a per-load id still gets counted.
    return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

let sent = false;

export function trackVisitOnce(): void {
  if (sent) return;
  sent = true;
  try {
    const u = WebApp?.initDataUnsafe?.user;
    const payload = {
      anonId: getAnonId(),
      username: u?.username ?? null,
      firstName: u?.first_name ?? null,
      lastName: u?.last_name ?? null,
      languageCode: u?.language_code ?? null,
      isPremium: typeof u?.is_premium === 'boolean' ? u.is_premium : null,
      platform: WebApp?.platform ?? null,
      appVersion: typeof __BUILD_ID__ !== 'undefined' ? String(__BUILD_ID__) : null,
      startParam: WebApp?.initDataUnsafe?.start_param ?? null,
      referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    };
    void trackAppVisit(payload).catch(() => {});
  } catch {
    /* never break the app */
  }
}
