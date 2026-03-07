import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { getTelegramUser } from '../utils/telegram';

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
        WebApp.ready();
        
        // Check if running in Telegram
        const isTelegram = WebApp.initData !== '';
        
        if (!isMounted) return;

        if (!isTelegram) {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            error: 'Telegram-нан ашылмайды',
            user: null,
          });
          return;
        }

        // Get user data
        const user = getTelegramUser();
        
        if (!user) {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            error: 'Пайдаланушы деректері табылмады',
            user: null,
          });
          return;
        }

        // Validate user ID
        if (!user.id) {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            error: 'Жарамсыз пайдаланушы ID',
            user: null,
          });
          return;
        }

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          user: user,
        });

        // Expand WebApp to full screen
        WebApp.expand();

      } catch (err) {
        if (!isMounted) return;
        
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Аутентификация қатесі орын алды',
          user: null,
        });
      }
    };

    // Small delay to show loading state
    const timer = setTimeout(() => {
      authenticate();
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  return authState;
};
