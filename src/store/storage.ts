import WebApp from '@twa-dev/sdk';

/**
 * Robust Telegram User ID retrieval.
 * Tries window.Telegram.WebApp and the imported WebApp SDK.
 */
const getTelegramUserId = (): string | null => {
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user || WebApp?.initDataUnsafe?.user;
  if (user?.id) return String(user.id);
  
  // Try to parse from initData string if initDataUnsafe is empty
  try {
    const initData = window.Telegram?.WebApp?.initData || WebApp?.initData;
    if (initData) {
      const searchParams = new URLSearchParams(initData);
      const userStr = searchParams.get('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj.id) return String(userObj.id);
      }
    }
  } catch (e) {
    console.error('Error parsing initData for UID:', e);
  }
  
  return null;
};

// Custom Storage Engine for Zustand Persist
export const telegramStorage = {
  /**
   * Internal helper to scope keys by user ID.
   * This ensures that different Telegram accounts on the same device/browser
   * use different storage keys.
   */
  _scopedKey: (name: string): string => {
    const uid = getTelegramUserId();
    if (uid) {
      return `${name}_u${uid}`;
    }
    // Fallback for non-telegram environments (e.g. local dev)
    return `${name}_local`;
  },

  getItem: async (name: string): Promise<string | null> => {
    const key = telegramStorage._scopedKey(name);

    // 1. Try to get from Telegram CloudStorage (Only if version >= 6.9)
    if (WebApp.isVersionAtLeast('6.9') && WebApp.CloudStorage) {
      try {
        return new Promise((resolve) => {
          let settled = false;
          const settle = (val: string | null) => {
            if (settled) return;
            settled = true;
            resolve(val);
          };

          const timeout = setTimeout(() => {
            settle(localStorage.getItem(key));
          }, 2000);

          WebApp.CloudStorage.getItem(key, (err, value) => {
            clearTimeout(timeout);
            if (err) {
              settle(localStorage.getItem(key));
              return;
            }
            if (value) {
              settle(value);
              return;
            }
            const localValue = localStorage.getItem(key);
            if (localValue) {
              WebApp.CloudStorage.setItem(key, localValue, () => {});
              settle(localValue);
            } else {
              settle(null);
            }
          });
        });
      } catch {
        return localStorage.getItem(key);
      }
    }
    
    // 2. Fallback to LocalStorage
    return localStorage.getItem(key);
  },

  setItem: async (name: string, value: string): Promise<void> => {
    const key = telegramStorage._scopedKey(name);
    
    // Save to LocalStorage immediately
    localStorage.setItem(key, value);

    // Save to Telegram CloudStorage (async)
    if (WebApp.isVersionAtLeast('6.9') && WebApp.CloudStorage) {
      WebApp.CloudStorage.setItem(key, value, (err) => {
        if (err && import.meta.env.DEV) {
          console.error(`[CloudStorage] Set Error for ${key}:`, err);
        }
      });
    }
  },

  removeItem: async (name: string): Promise<void> => {
    const key = telegramStorage._scopedKey(name);
    localStorage.removeItem(key);
    if (WebApp.isVersionAtLeast('6.9') && WebApp.CloudStorage) {
      WebApp.CloudStorage.removeItem(key, (err) => {
        if (err && import.meta.env.DEV) console.error('[CloudStorage] Remove Error:', err);
      });
    }
  },
};
