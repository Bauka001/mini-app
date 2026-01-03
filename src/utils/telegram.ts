export const getTelegramUser = () => {
  // @ts-ignore
  if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
    // @ts-ignore
    return window.Telegram.WebApp.initDataUnsafe.user;
  }
  return null;
};

export const isTelegramWebApp = () => {
  // @ts-ignore
  return !!window.Telegram?.WebApp;
};

export const MOCK_USER = {
  id: 123456789,
  first_name: 'Traveler',
  last_name: '',
  username: 'traveler',
  photo_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
};
