import type { EncryptionHeader } from '@/types/storage';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// Base64 helpers keep binary fields JSON-friendly for logging and hashing.
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Serialize headers deterministically so hashes remain stable across sessions.
export function serializeEncryptionHeader(header: EncryptionHeader) {
  return {
    kdf: header.kdf,
    kdf_params: header.kdf_params,
    salt: arrayBufferToBase64(header.salt),
    cipher: header.cipher,
    iv: arrayBufferToBase64(header.iv),
    version: header.version,
  };
}

export function deserializeEncryptionHeader(serialized: {
  kdf: 'PBKDF2';
  kdf_params: { hash: 'SHA-256'; iterations: number };
  salt: string;
  cipher: 'AES-GCM';
  iv: string;
  version: string;
}): EncryptionHeader {
  return {
    kdf: serialized.kdf,
    kdf_params: serialized.kdf_params,
    salt: base64ToArrayBuffer(serialized.salt),
    cipher: serialized.cipher,
    iv: base64ToArrayBuffer(serialized.iv),
    version: serialized.version,
  };
}

// Generates a random salt for PBKDF2.
export function generateSalt(length = 16): ArrayBuffer {
  const salt = new Uint8Array(length);
  crypto.getRandomValues(salt);
  return salt.buffer;
}

// Generates a unique IV for AES-GCM (96-bit recommended).
export function generateIV(): ArrayBuffer {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return iv.buffer;
}

// Derives an AES-GCM key from a passphrase using PBKDF2.
export async function deriveKey(
  passphrase: string,
  salt: ArrayBuffer,
  iterations: number,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// Encrypts plaintext with AES-GCM using the provided IV.
export async function encrypt(
  plaintext: ArrayBuffer,
  key: CryptoKey,
  iv: ArrayBuffer,
): Promise<ArrayBuffer> {
  return crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
}

// Decrypts ciphertext with AES-GCM using the provided IV.
export async function decrypt(
  ciphertext: ArrayBuffer,
  key: CryptoKey,
  iv: ArrayBuffer,
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
}

// Hash ciphertext + header to detect tampering or corruption.
export async function hashTranscript(
  ciphertext: ArrayBuffer,
  header: EncryptionHeader,
): Promise<ArrayBuffer> {
  const headerJson = JSON.stringify(serializeEncryptionHeader(header));
  const headerBytes = textEncoder.encode(headerJson);
  const combined = new Uint8Array(headerBytes.length + ciphertext.byteLength);
  combined.set(headerBytes, 0);
  combined.set(new Uint8Array(ciphertext), headerBytes.length);
  return crypto.subtle.digest('SHA-256', combined);
}

// Encode JSON for encrypted storage; keeps storage format consistent.
export function encodeJson(value: unknown): ArrayBuffer {
  return textEncoder.encode(JSON.stringify(value)).buffer;
}

export function decodeJson<T>(buffer: ArrayBuffer): T {
  return JSON.parse(textDecoder.decode(buffer)) as T;
}
