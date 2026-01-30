// Key is held in memory only; never persisted.
let cachedKey: CryptoKey | null = null;

export function setKey(key: CryptoKey) {
  cachedKey = key;
}

export function getKey(): CryptoKey | null {
  return cachedKey;
}

export function clearKey() {
  cachedKey = null;
}

export function isUnlocked(): boolean {
  return cachedKey !== null;
}
