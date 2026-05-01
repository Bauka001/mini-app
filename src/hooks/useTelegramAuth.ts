import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { getTelegramUser } from '../utils/telegram';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  // Translation key for the user-visible label.
  errorKey: string | null;
  // Machine-readable reason from /auth/verify (e.g. 'bot_token_missing',
  // 'auth_date_expired', 'hash_mismatch'). Surfaced under the label so the
  // operator can diagnose backend config issues.
  errorReason: string | null;
  user: any | null;
  // Browser/PWA visitors with no Telegram identity. Local-only gameplay; the
  // store and server skip any path that requires a real telegram_id.
  isGuest: boolean;
}

export const useTelegramAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    errorKey: null,
    errorReason: null,
    user: null,
    isGuest: false,
  });

  useEffect(() => {
    let isMounted = true;

    const authenticate = async () => {
      try {
        // Initialize Telegram WebApp
        if (WebApp) {
          WebApp.ready();
          WebApp.expand();
        }
        
        // Check if running in Telegram
        // In local development or browser, initData might be empty
        const isTelegram = WebApp && WebApp.initData !== '';
        
        if (!isMounted) return;

        // Get user data
        const user = getTelegramUser();
        
        // Browser / PWA visitor — no Telegram identity. Allow local-only play
        // as a guest. The store skips server sync when user.id === 0, and the
        // backend rejects calls without initData via authLimiter + initData
        // HMAC, so guests have no path to authenticated endpoints.
        if (!isTelegram && !user) {
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            errorKey: null,
            errorReason: null,
            user: { id: 0, first_name: 'Guest' },
            isGuest: true,
          });
          return;
        }

        if (!user && isTelegram) {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            errorKey: 'auth_error_user_missing',
            errorReason: 'no_user_in_init_data',
            user: null,
            isGuest: false,
          });
          return;
        }

        // We do not gate UI render on /auth/verify. Telegram already validates
        // initData when launching the WebApp, and every server endpoint that
        // returns user data (e.g. /users/me, /games/submit, /tickets/issue)
        // re-verifies the HMAC with BOT_TOKEN on its own — so the UI block was
        // redundant with the real security boundary. Removing it lets the app
        // load even when the backend env isn't fully configured yet.
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          errorKey: null,
          errorReason: null,
          user: user || { id: 0, first_name: 'Guest' },
          isGuest: !isTelegram,
        });

      } catch (err) {
        if (!isMounted) return;

        console.error('Auth error:', err);
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          errorKey: 'auth_error_generic',
          errorReason: err instanceof Error ? err.message : null,
          user: null,
          isGuest: false,
        });
      }
    };

    authenticate();

    return () => {
      isMounted = false;
    };
  }, []);

  return authState;
};
