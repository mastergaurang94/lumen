import { webcrypto } from 'crypto';
import 'fake-indexeddb/auto';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { getActiveDb, setActiveDbScope } from '@/lib/db';
import { deriveKey, generateSalt } from '@/lib/crypto';
import { createStorageService } from '@/lib/storage/dexie-storage';
import { buildVaultMetadata, createKeyCheck } from '@/lib/storage/metadata';
import { setStorageScopeForUser } from '@/lib/storage/scope';
import type { UserProfile } from '@/types/storage';

const createdScopes = new Set<string>();

beforeAll(() => {
  if (!globalThis.crypto) {
    globalThis.crypto = webcrypto as unknown as Crypto;
  }
});

afterEach(async () => {
  for (const scope of createdScopes) {
    setActiveDbScope(scope);
    await getActiveDb().delete();
  }
  createdScopes.clear();
  setActiveDbScope('default');
});

async function initializeVaultForCurrentScope(userId: string) {
  const storage = createStorageService();
  const salt = generateSalt();
  const iterations = 10;
  const key = await deriveKey('passphrase', salt, iterations);
  const keyCheck = await createKeyCheck(key, salt, iterations, 'enc-v0.1');
  const metadata = buildVaultMetadata({ salt, iterations, version: 'enc-v0.1', keyCheck });
  await storage.saveVaultMetadata(metadata);
  storage.setVaultContext({ key, metadata });

  const now = new Date().toISOString();
  const profile: UserProfile = {
    user_id: userId,
    preferred_name: null,
    goals: [],
    recurring_themes: [],
    preferences: [],
    created_at: now,
    updated_at: now,
  };
  await storage.saveProfile(profile);
  return { key, metadata };
}

describe('scoped storage', () => {
  it('isolates vault data by authenticated user scope', async () => {
    const userA = '11111111-1111-1111-1111-111111111111';
    const userB = '22222222-2222-2222-2222-222222222222';
    const scopeA = `user-${userA}`;
    const scopeB = `user-${userB}`;
    createdScopes.add(scopeA);
    createdScopes.add(scopeB);

    setStorageScopeForUser(userA);
    const vaultA = await initializeVaultForCurrentScope(userA);

    setStorageScopeForUser(userB);
    const storageB = createStorageService();
    expect(await storageB.getVaultMetadata()).toBeNull();

    setStorageScopeForUser(userA);
    const storageA = createStorageService();
    storageA.setVaultContext(vaultA);
    const profileA = await storageA.getProfile(userA);
    expect(profileA?.user_id).toBe(userA);

    setStorageScopeForUser(userB);
    expect(await storageB.getProfile(userA)).toBeNull();
  });
});
