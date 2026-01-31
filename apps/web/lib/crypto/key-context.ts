// Key is held in memory only; never persisted.
let cachedKey: CryptoKey | null = null;
const lockHandlers = new Set<() => Promise<void> | void>();

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

// Registers handlers to run before the vault is locked. Returns an unregister function.
export function registerLockHandler(handler: () => Promise<void> | void): () => void {
  lockHandlers.add(handler);
  return () => {
    lockHandlers.delete(handler);
  };
}

// Flushes registered handlers before clearing the in-memory key.
export async function lockVault() {
  for (const handler of lockHandlers) {
    await handler();
  }
  clearKey();
}
