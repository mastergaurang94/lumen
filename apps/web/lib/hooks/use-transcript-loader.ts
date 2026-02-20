'use client';

import * as React from 'react';
import { decrypt } from '@/lib/crypto';
import { getKey } from '@/lib/crypto/key-context';
import { createStorageService } from '@/lib/storage/dexie-storage';
import { deserializeMessages } from '@/lib/storage/transcript';
import type { Message } from '@/types/session';
import type { SessionNotebook } from '@/types/storage';

type TranscriptLoaderResult = {
  messages: Message[];
  notebook: SessionNotebook | null;
  isLoading: boolean;
  error: string | null;
};

// Decrypts transcript chunks into Message[] and loads the session notebook.
export function useTranscriptLoader(sessionId: string | null): TranscriptLoaderResult {
  const storageRef = React.useRef(createStorageService());
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [notebook, setNotebook] = React.useState<SessionNotebook | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const key = getKey();
        if (!key) {
          setError('Vault is locked.');
          setIsLoading(false);
          return;
        }

        const storage = storageRef.current;

        // Ensure vault context is set for decryption.
        const metadata = await storage.getVaultMetadata();
        if (metadata) {
          storage.setVaultContext({ key, metadata });
        }

        const [chunks, sessionNotebook] = await Promise.all([
          storage.listTranscriptChunks(sessionId),
          storage.getNotebook(sessionId),
        ]);

        if (cancelled) return;

        // Decrypt each chunk and concatenate messages (same pattern as assembly.ts)
        const allMessages: Message[] = [];
        for (const chunk of chunks) {
          const decrypted = await decrypt(chunk.encrypted_blob, key, chunk.encryption_header.iv);
          allMessages.push(...deserializeMessages(decrypted));
        }

        if (cancelled) return;

        setMessages(allMessages);
        setNotebook(sessionNotebook);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load transcript', err);
        setError('Could not decrypt this conversation.');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return { messages, notebook, isLoading, error };
}
