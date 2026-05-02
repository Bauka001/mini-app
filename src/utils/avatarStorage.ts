export class AvatarStorage {
  private static DB_NAME = 'FocusAppDB';
  private static STORE_NAME = 'avatars';
  private static DB_VERSION = 1;

  private static async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
        }
      };
    });
  }

  static async saveAvatar(userId: number, avatarData: string): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      const record = {
        id: `user_${userId}`,
        userId,
        data: avatarData,
        timestamp: Date.now()
      };

      const request = store.put(record);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error saving avatar:', error);
      throw error;
    }
  }

  static async getAvatar(userId: number): Promise<string | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(`user_${userId}`);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.data : null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting avatar:', error);
      return null;
    }
  }

  static async deleteAvatar(userId: number): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(`user_${userId}`);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error deleting avatar:', error);
      throw error;
    }
  }

  static async clearOldAvatars(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.openCursor();

      const now = Date.now();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            const record = cursor.value;
            if (now - record.timestamp > maxAge) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error clearing old avatars:', error);
      throw error;
    }
  }

  static async getStorageUsage(): Promise<number> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAllKeys();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result.length);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return 0;
    }
  }
}
