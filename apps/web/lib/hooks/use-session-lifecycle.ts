import * as React from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import { buildSessionContext } from '@/lib/context/assembly';
import { decrypt, encrypt, generateIV, hashTranscript } from '@/lib/crypto';
import { getKey, isUnlocked } from '@/lib/crypto/key-context';
import { enqueueSessionStart, flushSessionOutbox } from '@/lib/outbox/session-outbox';
import { getSessionNumber } from '@/lib/storage/queries';
import { deserializeMessages, serializeMessages } from '@/lib/storage/transcript';
import { getOrCreateUserId } from '@/lib/storage/user';
import type { StorageService } from '@/lib/storage';
import { DEFAULT_MODEL_ID } from '@/lib/llm/model-config';
import type { Message, SessionState } from '@/types/session';
import type { SessionTranscript, SessionTranscriptChunk, VaultMetadata } from '@/types/storage';

type UseSessionLifecycleParams = {
  storage: StorageService;
  router: AppRouterInstance;
  isAuthed: boolean;
  sessionState: SessionState;
  setSessionState: React.Dispatch<React.SetStateAction<SessionState>>;
  onMessagesRestored: (messages: Message[]) => void;
  onResumeHasCoachMessage: () => void;
  onResumeActiveTimer: (sessionId: string) => void;
  onNewSessionActiveTimer: (sessionId: string) => void;
};

type UseSessionLifecycleResult = {
  vaultReady: boolean;
  storageReady: boolean;
  isRetrying: boolean;
  handleRetry: () => void;
  sessionDateRef: React.MutableRefObject<Date>;
  sessionContextRef: React.MutableRefObject<string | null>;
  transcriptRef: React.MutableRefObject<SessionTranscript | null>;
  sessionIdRef: React.MutableRefObject<string | null>;
  sessionId: string | null;
  userIdRef: React.MutableRefObject<string | null>;
  isResumingRef: React.MutableRefObject<boolean>;
  lastTranscriptHashRef: React.MutableRefObject<ArrayBuffer | null>;
  flushPendingMessages: () => Promise<void>;
  queueMessageForChunk: (message: Message) => void;
};

/**
 * Manages session initialization, transcript persistence, and outbox sync.
 *
 * Initialization flows through two gates:
 *   1. vaultReady  — encryption key is available and vault metadata loaded
 *   2. storageReady — session transcript exists and context is assembled
 *
 * Components should wait for storageReady before sending LLM requests.
 */
export function useSessionLifecycle({
  storage,
  router,
  isAuthed,
  sessionState,
  setSessionState,
  onMessagesRestored,
  onResumeHasCoachMessage,
  onResumeActiveTimer,
  onNewSessionActiveTimer,
}: UseSessionLifecycleParams): UseSessionLifecycleResult {
  const vaultMetadataRef = React.useRef<VaultMetadata | null>(null);
  const userIdRef = React.useRef<string | null>(null);
  // Session ID is tracked as both a ref (for synchronous access in callbacks
  // and effects without stale closures) and state (to trigger re-renders when
  // the session changes, e.g., for the active timer hook).
  const sessionIdRef = React.useRef<string | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const transcriptRef = React.useRef<SessionTranscript | null>(null);
  const sessionContextRef = React.useRef<string | null>(null);
  const lastTranscriptHashRef = React.useRef<ArrayBuffer | null>(null);
  const chunkIndexRef = React.useRef(0);
  const pendingMessagesRef = React.useRef<Message[]>([]);
  const flushTimeoutRef = React.useRef<number | null>(null);
  // Tracks whether we're resuming an existing session vs. starting fresh.
  // When true, the LLM conversation hook skips the initial greeting prompt.
  const isResumingRef = React.useRef(false);
  // Guards against double initialization (e.g., React Strict Mode, unstable deps).
  const storageInitializedRef = React.useRef(false);
  const sessionDateRef = React.useRef(new Date());
  const [vaultReady, setVaultReady] = React.useState(false);
  const [storageReady, setStorageReady] = React.useState(false);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const withDevAuth = React.useCallback((path: string) => {
    if (process.env.NODE_ENV !== 'development') return path;
    if (typeof window === 'undefined') return path;
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev_auth') !== '1') return path;
    return `${path}?dev_auth=1`;
  }, []);

  // Persist buffered messages as a single encrypted chunk.
  const flushPendingMessages = React.useCallback(async () => {
    const pending = pendingMessagesRef.current;
    if (pending.length === 0) return;

    const key = getKey();
    const metadata = vaultMetadataRef.current;
    const sessionId = sessionIdRef.current;
    const transcript = transcriptRef.current;

    if (!key || !metadata || !sessionId || !transcript) return;

    const iv = generateIV();
    const header = {
      kdf: 'PBKDF2' as const,
      kdf_params: { hash: 'SHA-256' as const, iterations: metadata.kdf_iterations },
      salt: metadata.salt,
      cipher: 'AES-GCM' as const,
      iv,
      version: metadata.encryption_version,
    };

    const plaintext = serializeMessages(pending);
    const ciphertext = await encrypt(plaintext, key, iv);
    const transcript_hash = await hashTranscript(ciphertext, header);
    lastTranscriptHashRef.current = transcript_hash;

    const chunk: SessionTranscriptChunk = {
      session_id: sessionId,
      chunk_index: chunkIndexRef.current,
      encrypted_blob: ciphertext,
      encryption_header: header,
      transcript_hash,
      created_at: new Date().toISOString(),
    };

    await storage.saveTranscriptChunk(chunk);
    chunkIndexRef.current += 1;
    pendingMessagesRef.current = [];

    const now = new Date().toISOString();
    const updatedTranscript = { ...transcript, updated_at: now };
    transcriptRef.current = updatedTranscript;
    await storage.saveTranscript(updatedTranscript);
  }, [storage]);

  // Debounce chunk flushes to avoid excessive writes.
  const CHUNK_FLUSH_DEBOUNCE_MS = 1200;
  const scheduleChunkFlush = React.useCallback(() => {
    if (flushTimeoutRef.current) {
      window.clearTimeout(flushTimeoutRef.current);
    }
    flushTimeoutRef.current = window.setTimeout(() => {
      void flushPendingMessages();
    }, CHUNK_FLUSH_DEBOUNCE_MS);
  }, [flushPendingMessages]);

  // Queue messages into a buffer that flushes to chunked storage.
  const queueMessageForChunk = React.useCallback(
    (message: Message) => {
      pendingMessagesRef.current = [...pendingMessagesRef.current, message];
      scheduleChunkFlush();
    },
    [scheduleChunkFlush],
  );

  // Check vault and initialize encryption context.
  React.useEffect(() => {
    if (!isAuthed) return;

    const checkVault = async () => {
      const metadata = await storage.getVaultMetadata();
      if (!metadata) {
        router.push(withDevAuth('/setup'));
        return;
      }
      if (!isUnlocked()) {
        router.push(withDevAuth('/unlock'));
        return;
      }
      const key = getKey();
      if (!key) {
        router.push(withDevAuth('/unlock'));
        return;
      }
      vaultMetadataRef.current = metadata;
      storage.setVaultContext({ key, metadata });
      userIdRef.current = getOrCreateUserId();
      setVaultReady(true);
    };

    checkVault();
  }, [isAuthed, router, storage]);

  // Flush pending session metadata when the user is online.
  React.useEffect(() => {
    if (!isAuthed) return;
    void flushSessionOutbox();

    const handleOnline = () => {
      void flushSessionOutbox();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [isAuthed]);

  // Check coach availability and initialize session state.
  const initializeSession = React.useCallback(async () => {
    setSessionState('loading');

    // Simulate checking coach availability
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Check mock toggles for testing edge states
    if (process.env.NEXT_PUBLIC_MOCK_COACH_UNAVAILABLE === 'true') {
      setSessionState('unavailable');
      return;
    }

    if (process.env.NEXT_PUBLIC_MOCK_CONNECTION_ERROR === 'true') {
      setSessionState('error');
      return;
    }

    // Coach is available, start session
    setSessionState('active');
  }, [setSessionState]);

  // Initialize on mount
  React.useEffect(() => {
    if (!vaultReady) return;

    initializeSession();

    return () => {
      if (flushTimeoutRef.current) {
        window.clearTimeout(flushTimeoutRef.current);
      }
    };
  }, [initializeSession, vaultReady]);

  // Resume or create session transcript once active.
  React.useEffect(() => {
    if (sessionState !== 'active' || !vaultReady) return;
    if (storageInitializedRef.current) return;
    storageInitializedRef.current = true;

    const initStorageSession = async () => {
      const userId = userIdRef.current;
      if (!userId) return;

      const key = getKey();
      if (!key) return;

      const transcripts = await storage.listTranscripts(userId);
      const activeTranscript =
        transcripts.find((transcript) => transcript.ended_at === null) ?? null;

      if (activeTranscript) {
        // Resume the active transcript by replaying chunked payloads.
        isResumingRef.current = true;
        sessionIdRef.current = activeTranscript.session_id;
        setSessionId(activeTranscript.session_id);
        transcriptRef.current = activeTranscript;
        sessionDateRef.current = new Date(activeTranscript.started_at);
        onResumeActiveTimer(activeTranscript.session_id);

        const chunks = await storage.listTranscriptChunks(activeTranscript.session_id);
        chunkIndexRef.current = chunks.length;
        lastTranscriptHashRef.current =
          chunks.length > 0 ? chunks[chunks.length - 1].transcript_hash : null;

        await enqueueSessionStart(activeTranscript.session_id);
        void flushSessionOutbox();

        const restoredMessages: Message[] = [];
        for (const chunk of chunks) {
          const decrypted = await decrypt(chunk.encrypted_blob, key, chunk.encryption_header.iv);
          restoredMessages.push(...deserializeMessages(decrypted));
        }

        if (restoredMessages.length > 0) {
          onMessagesRestored(restoredMessages);
          const hasCoachMessage = restoredMessages.some((message) => message.role === 'coach');
          if (hasCoachMessage) {
            onResumeHasCoachMessage();
          }
        } else {
          // No transcript content yet; treat as a fresh session so the intro prompt runs.
          isResumingRef.current = false;
        }

        // Build context before marking storage ready so LLM calls have context available.
        sessionContextRef.current = await buildSessionContext({
          storage,
          userId,
          key,
          options: { modelId: DEFAULT_MODEL_ID },
        });
        console.info('context assembly complete', {
          context_chars: sessionContextRef.current.length,
          model_id: DEFAULT_MODEL_ID,
        });
        setStorageReady(true);
        return;
      }

      // Start a new transcript and mark it active.
      isResumingRef.current = false;
      const sessionNumber = await getSessionNumber(storage, userId);
      const now = new Date();
      const sessionId = crypto.randomUUID();
      const transcript: SessionTranscript = {
        session_id: sessionId,
        user_id: userId,
        started_at: now.toISOString(),
        ended_at: null,
        session_number: sessionNumber,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
        locale_hint: navigator.language ?? null,
        system_prompt_version: 'intake-v0.1',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      sessionIdRef.current = sessionId;
      setSessionId(sessionId);
      transcriptRef.current = transcript;
      chunkIndexRef.current = 0;
      onNewSessionActiveTimer(sessionId);
      await storage.saveTranscript(transcript);
      await enqueueSessionStart(sessionId);
      void flushSessionOutbox();
      // Build context before marking storage ready so LLM calls have context available.
      sessionContextRef.current = await buildSessionContext({
        storage,
        userId,
        key,
        options: { modelId: DEFAULT_MODEL_ID },
      });
      console.info('context assembly complete', {
        context_chars: sessionContextRef.current.length,
        model_id: DEFAULT_MODEL_ID,
      });
      setStorageReady(true);
    };

    initStorageSession();
  }, [
    onMessagesRestored,
    onNewSessionActiveTimer,
    onResumeActiveTimer,
    onResumeHasCoachMessage,
    sessionState,
    storage,
    vaultReady,
  ]);

  React.useEffect(() => {
    if (!storageReady) return;
    if (pendingMessagesRef.current.length === 0) return;
    scheduleChunkFlush();
  }, [scheduleChunkFlush, storageReady]);

  const handleRetry = React.useCallback(async () => {
    setIsRetrying(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsRetrying(false);
    initializeSession();
  }, [initializeSession]);

  return {
    vaultReady,
    storageReady,
    isRetrying,
    handleRetry,
    sessionDateRef,
    sessionContextRef,
    transcriptRef,
    sessionIdRef,
    sessionId,
    userIdRef,
    isResumingRef,
    lastTranscriptHashRef,
    flushPendingMessages,
    queueMessageForChunk,
  };
}
