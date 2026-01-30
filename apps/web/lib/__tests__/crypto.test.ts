import { webcrypto } from 'crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  decrypt,
  deriveKey,
  encrypt,
  generateIV,
  generateSalt,
  hashTranscript,
  serializeEncryptionHeader,
  deserializeEncryptionHeader,
} from '@/lib/crypto';

beforeAll(() => {
  if (!globalThis.crypto) {
    globalThis.crypto = webcrypto as unknown as Crypto;
  }
});

describe('crypto utilities', () => {
  it('encrypts and decrypts a payload', async () => {
    const salt = generateSalt();
    const key = await deriveKey('passphrase', salt, 10);
    const iv = generateIV();
    const plaintext = new TextEncoder().encode('hello world').buffer;
    const ciphertext = await encrypt(plaintext, key, iv);
    const decrypted = await decrypt(ciphertext, key, iv);
    expect(new TextDecoder().decode(decrypted)).toBe('hello world');
  });

  it('round-trips encryption headers', () => {
    const header = {
      kdf: 'PBKDF2' as const,
      kdf_params: { hash: 'SHA-256' as const, iterations: 10 },
      salt: generateSalt(),
      cipher: 'AES-GCM' as const,
      iv: generateIV(),
      version: 'enc-v0.1',
    };
    const serialized = serializeEncryptionHeader(header);
    const deserialized = deserializeEncryptionHeader(serialized);
    expect(deserialized.kdf).toBe(header.kdf);
    expect(deserialized.kdf_params.iterations).toBe(header.kdf_params.iterations);
    expect(deserialized.version).toBe(header.version);
  });

  it('hashes transcript payloads', async () => {
    const salt = generateSalt();
    const key = await deriveKey('passphrase', salt, 10);
    const iv = generateIV();
    const plaintext = new TextEncoder().encode('hash me').buffer;
    const header = {
      kdf: 'PBKDF2' as const,
      kdf_params: { hash: 'SHA-256' as const, iterations: 10 },
      salt,
      cipher: 'AES-GCM' as const,
      iv,
      version: 'enc-v0.1',
    };
    const ciphertext = await encrypt(plaintext, key, iv);
    const digest = await hashTranscript(ciphertext, header);
    expect(new Uint8Array(digest)).toHaveLength(32);
  });
});
