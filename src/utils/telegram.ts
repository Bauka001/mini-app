import WebApp from '@twa-dev/sdk';
import { getDefaultAvatarUrl } from '../constants/avatars';

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export const hapticFeedback = {
  impact: (type: 'light' | 'medium' | 'heavy' = 'medium') => {
    try {
      if (WebApp?.HapticFeedback) {
        WebApp.HapticFeedback.impactOccurred(type);
      }
    } catch (e) {
      console.warn('HapticFeedback not available:', e);
    }
  },

  notification: (type: 'success' | 'warning' | 'error' = 'success') => {
    try {
      if (WebApp?.HapticFeedback) {
        WebApp.HapticFeedback.notificationOccurred(type);
      }
    } catch (e) {
      console.warn('HapticFeedback not available:', e);
    }
  },

  selection: () => {
    try {
      if (WebApp?.HapticFeedback) {
        WebApp.HapticFeedback.selectionChanged();
      }
    } catch (e) {
      console.warn('HapticFeedback not available:', e);
    }
  },

  click: () => {
    hapticFeedback.impact('light');
  }
};

export const getTelegramUser = () => {
  if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
    return window.Telegram.WebApp.initDataUnsafe.user;
  }
  return null;
};

export const getTelegramStartParam = () => {
  const unsafeStartParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (unsafeStartParam) {
    return `${unsafeStartParam}`.trim().toLowerCase();
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const fallbackStartParam = params.get('tgWebAppStartParam') || params.get('startapp') || params.get('start_param');
    return fallbackStartParam ? fallbackStartParam.trim().toLowerCase() : '';
  } catch {
    return '';
  }
};

export const hasTelegramStartParam = (expectedValue: string) =>
  getTelegramStartParam() === `${expectedValue}`.trim().toLowerCase();

export const isTelegramWebApp = () => {
  return !!window.Telegram?.WebApp;
};

export const MOCK_USER = {
  id: 123456789,
  first_name: 'Traveler',
  last_name: '',
  username: 'traveler',
  photo_url: getDefaultAvatarUrl('Traveler')
};
