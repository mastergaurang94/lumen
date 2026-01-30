import {
  decodeJson,
  encodeJson,
  encrypt,
  decrypt,
  generateIV,
  hashTranscript,
} from '@/lib/crypto';
import type { EncryptionHeader, VaultKeyCheck, VaultMetadata } from '@/types/storage';

export const VAULT_METADATA_ID = 'vault';
// Iteration count will be tuned after local perf tests.
export const DEFAULT_KDF_ITERATIONS = 600_000;
export const DEFAULT_ENCRYPTION_VERSION = 'enc-v0.1';
// Sentinel string is encrypted and verified on unlock.
const KEY_CHECK_SENTINEL = 'lumen-vault-key-check';

// Creates an encrypted sentinel used to verify the passphrase on unlock.
export async function createKeyCheck(
  key: CryptoKey,
  salt: ArrayBuffer,
  iterations: number,
  version: string,
): Promise<VaultKeyCheck> {
  const iv = generateIV();
  const header: EncryptionHeader = {
    kdf: 'PBKDF2',
    kdf_params: { hash: 'SHA-256', iterations },
    salt,
    cipher: 'AES-GCM',
    iv,
    version,
  };
  const plaintext = encodeJson({ sentinel: KEY_CHECK_SENTINEL });
  const ciphertext = await encrypt(plaintext, key, iv);
  const transcript_hash = await hashTranscript(ciphertext, header);

  return {
    encrypted_blob: ciphertext,
    encryption_header: header,
    transcript_hash,
  };
}

// Validates the key by decrypting the sentinel payload.
export async function verifyKeyCheck(key: CryptoKey, keyCheck: VaultKeyCheck): Promise<boolean> {
  try {
    const decrypted = await decrypt(
      keyCheck.encrypted_blob,
      key,
      keyCheck.encryption_header.iv,
    );
    const payload = decodeJson<{ sentinel: string }>(decrypted);
    return payload.sentinel === KEY_CHECK_SENTINEL;
  } catch {
    return false;
  }
}

// Builds a new metadata record and timestamps it.
export function buildVaultMetadata(params: {
  salt: ArrayBuffer;
  iterations: number;
  version: string;
  keyCheck: VaultKeyCheck | null;
}): VaultMetadata {
  const now = new Date().toISOString();
  return {
    id: VAULT_METADATA_ID,
    vault_initialized: true,
    salt: params.salt,
    kdf_iterations: params.iterations,
    encryption_version: params.version,
    key_check: params.keyCheck,
    created_at: now,
    updated_at: now,
  };
}
