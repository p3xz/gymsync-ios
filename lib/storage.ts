// AsyncStorage wrapper with the same 'gymsync:' key prefix the web app
// uses for localStorage, so key names stay familiar across both apps.

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'gymsync:';

export const Storage = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch (error) {
      console.warn(`GymSync: could not read "${key}" from storage.`, error);
      return fallback;
    }
  },

  async set(key: string, value: unknown): Promise<boolean> {
    try {
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`GymSync: could not save "${key}" to storage.`, error);
      return false;
    }
  },

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(PREFIX + key);
  },

  /** Wipes every gymsync-namespaced key, leaving other apps' storage alone. */
  async clearAll(): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const ours = allKeys.filter((key) => key.startsWith(PREFIX));
    if (ours.length > 0) {
      await AsyncStorage.multiRemove(ours);
    }
  },
};
