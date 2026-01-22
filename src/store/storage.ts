import WebApp from '@twa-dev/sdk';

// Custom Storage Engine for Zustand Persist
export const telegramStorage = {
  getItem: async (name: string): Promise<string | null> => {
    // 1. Try to get from Telegram CloudStorage (Only if version >= 6.9)
    if (WebApp.isVersionAtLeast('6.9') && WebApp.CloudStorage) {
      try {
        return new Promise((resolve, reject) => {
          WebApp.CloudStorage.getItem(name, (err, value) => {
            if (err) {
              console.error('[CloudStorage] Get Error:', err);
              // Fallback to localStorage on error
              resolve(localStorage.getItem(name));
            } else {
              if (value) {
                resolve(value);
              } else {
                // If cloud is empty, try local (migration scenario)
                const localValue = localStorage.getItem(name);
                if (localValue) {
                   // Migrate local to cloud
                   WebApp.CloudStorage.setItem(name, localValue);
                   resolve(localValue);
                } else {
                   resolve(null);
                }
              }
            }
          });
        });
      } catch (e) {
        console.error('[CloudStorage] Exception:', e);
        return localStorage.getItem(name);
      }
    }
    // 2. Fallback to LocalStorage (Development / Web)
    return localStorage.getItem(name);
  },

  setItem: async (name: string, value: string): Promise<void> => {
    // Save to LocalStorage immediately (for speed)
    localStorage.setItem(name, value);

    // Save to Telegram CloudStorage (async)
    if (WebApp.isVersionAtLeast('6.9') && WebApp.CloudStorage) {
      WebApp.CloudStorage.setItem(name, value, (err, stored) => {
        if (err) {
            console.error('[CloudStorage] Set Error:', err);
        }
      });
    }
  },

  removeItem: async (name: string): Promise<void> => {
    localStorage.removeItem(name);
    if (WebApp.isVersionAtLeast('6.9') && WebApp.CloudStorage) {
      WebApp.CloudStorage.removeItem(name, (err, stored) => {});
    }
  },
};
