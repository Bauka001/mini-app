import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { getTelegramUser, MOCK_USER } from '../utils/telegram';
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
        const isDev = import.meta.env.DEV;

        // Initialize Telegram WebApp
        if (WebApp) {
          WebApp.ready();
          WebApp.expand();
        }
        
        const initData = (window as any)?.Telegram?.WebApp?.initData || WebApp?.initData || '';

        if (!isMounted) return;

        // Get user data
        const user = getTelegramUser();

        if (!initData) {
          if (isDev) {
            console.warn('Telegram initData not found, using mock user in development');
            setAuthState({
              isAuthenticated: true,
              isLoading: false,
              error: null,
              user: user || MOCK_USER,
            });
            return;
          }

          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            error: 'Telegram Mini App ішінде ашу қажет',
            user: null,
          });
          return;
        }

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

        if (!user) {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            error: 'Пайдаланушы деректері табылмады',
            user: null,
          });
          return;
        }
        
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          user,
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
