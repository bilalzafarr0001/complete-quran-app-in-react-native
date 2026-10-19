import AsyncStorage from '@react-native-async-storage/async-storage';

/** Read a JSON value; returns null if missing or unreadable. */
export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Write a JSON value; storage failures are non-fatal for the app. */
export async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore: the app keeps working with in-memory state.
  }
}

export async function keysWithPrefix(prefix: string): Promise<string[]> {
  try {
    return (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(prefix));
  } catch {
    return [];
  }
}

export async function removeKeys(keys: string[]): Promise<void> {
  try {
    await AsyncStorage.removeMany(keys);
  } catch {
    // ignore
  }
}
