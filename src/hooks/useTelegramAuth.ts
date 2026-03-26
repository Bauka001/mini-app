import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { getTelegramUser } from '../utils/telegram';
import { verifyTelegramInitData } from '../utils/auth';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  user: any | null;
}

export const useTelegramAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
    user: null,
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
        
        if (!isTelegram && !user) {
          // If not in telegram and no mock user found, we still allow for local testing
          // but with a warning or fallback
          console.warn('Not in Telegram environment');
          // For now, let's allow it to proceed to not block the user
          setAuthState({
            isAuthenticated: true, // Set to true to allow entry in browser
            isLoading: false,
            error: null,
            user: { id: 0, first_name: 'Guest' },
          });
          return;
        }

        if (!user && isTelegram) {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            error: 'Пайдаланушы деректері табылмады',
            user: null,
          });
          return;
        }

        // If in Telegram, verify initData signature with backend
        if (isTelegram) {
          const initData = (window as any)?.Telegram?.WebApp?.initData || WebApp?.initData || '';
          const verify = await verifyTelegramInitData(initData);
          if (!verify?.ok) {
            setAuthState({
              isAuthenticated: false,
              isLoading: false,
              error: 'Telegram деректерін тексеру сәтсіз болды',
              user: null,
            });
            return;
          }
        }

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          user: user || { id: 0, first_name: 'Guest' },
        });

      } catch (err) {
        if (!isMounted) return;
        
        console.error('Auth error:', err);
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Аутентификация қатесі орын алды',
          user: null,
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
