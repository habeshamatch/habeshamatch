import * as SecureStore from 'expo-secure-store';

// Key-value storage backed by expo-secure-store (iOS Keychain / Android Keystore).
// Some iOS versions reject values above ~2 KB, so each value is split into chunks:
// `<key>` holds the chunk count, `<key>.<n>` the parts. 600 characters stays under 2 KB even
// for 3-byte characters such as Ge'ez script (Tigrinya, Amharic) in a bio.
// Used for the Supabase session and the onboarding draft.
const CHUNK_SIZE = 600;

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = await SecureStore.getItemAsync(key);
    if (count === null) return null;
    const parts: string[] = [];
    for (let i = 0; i < Number(count); i++) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      if (part === null) return null; // incomplete write, treat as missing
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    await secureStorage.removeItem(key);
    const count = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }
    await SecureStore.setItemAsync(key, String(count));
  },

  async removeItem(key: string): Promise<void> {
    const count = await SecureStore.getItemAsync(key);
    await SecureStore.deleteItemAsync(key);
    for (let i = 0; i < Number(count ?? 0); i++) {
      await SecureStore.deleteItemAsync(`${key}.${i}`);
    }
  },
};
