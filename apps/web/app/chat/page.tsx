'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sidebar } from '@/components/sidebar';
import { ErrorBoundary } from '@/components/error-boundary';
import { CoachUnavailable } from '@/components/coach-unavailable';
import {
  CoachMessage,
  UserMessage,
  TypingIndicator,
  ChatInput,
  SessionClosure,
  EndSessionDialog,
} from '@/components/chat';
import { formatSessionDate, formatElapsedTime } from '@/lib/format';
import { Z_INDEX } from '@/lib/z-index';
import { arrayBufferToHex, decrypt, encrypt, generateIV, hashTranscript } from '@/lib/crypto';
import { getKey, isUnlocked, registerLockHandler } from '@/lib/crypto/key-context';
import { useAuthSessionGuard } from '@/lib/hooks/use-auth-session-guard';
import { buildSessionContext } from '@/lib/context/assembly';
import {
  enqueueSessionEnd,
  enqueueSessionStart,
  flushSessionOutbox,
} from '@/lib/outbox/session-outbox';
import { createStorageService } from '@/lib/storage/dexie-storage';
import { getSessionNumber } from '@/lib/storage/queries';
import { getOrCreateUserId } from '@/lib/storage/user';
import {
  callLlmWithRetry,
  LlmAbortError,
  LlmInvalidKeyError,
  LlmUnavailableError,
  type LlmMessage,
} from '@/lib/llm/client';
import { DEFAULT_MODEL_ID, DEFAULT_PROVIDER } from '@/lib/llm/model-config';
import { buildSystemPrompt } from '@/lib/llm/prompts';
import { deserializeMessages, serializeMessages } from '@/lib/storage/transcript';
import type {
  LlmProviderKey,
  VaultMetadata,
  SessionTranscript,
  SessionTranscriptChunk,
  SessionSummary,
} from '@/types/storage';
import type { SessionState, Message } from '@/types/session';

// Mock toggles - use env vars in production
const MOCK_COACH_UNAVAILABLE = process.env.NEXT_PUBLIC_MOCK_COACH_UNAVAILABLE === 'true';
const MOCK_CONNECTION_ERROR = process.env.NEXT_PUBLIC_MOCK_CONNECTION_ERROR === 'true';

const INITIAL_COACH_INSTRUCTION =
  'Begin the session with a brief warm welcome, include a one-line privacy reminder, and ask one open question.';

// Active time lives in localStorage to avoid Dexie schema churn pre-launch.
const ACTIVE_TIME_STORAGE_PREFIX = 'lumen:session:active-time:';

type ActiveTimeRecord = {
  active_ms: number;
  last_active_started_at: string | null;
};

function getActiveTimeKey(sessionId: string): string {
  return `${ACTIVE_TIME_STORAGE_PREFIX}${sessionId}`;
}

// Load persisted active time safely, defaulting to zero on parse errors.
function readActiveTime(sessionId: string): ActiveTimeRecord {
  if (typeof window === 'undefined') {
    return { active_ms: 0, last_active_started_at: null };
  }
  try {
    const raw = window.localStorage.getItem(getActiveTimeKey(sessionId));
    if (!raw) return { active_ms: 0, last_active_started_at: null };
    const parsed = JSON.parse(raw) as Partial<ActiveTimeRecord>;
    return {
      active_ms: typeof parsed.active_ms === 'number' ? parsed.active_ms : 0,
      last_active_started_at:
        parsed.last_active_started_at && typeof parsed.last_active_started_at === 'string'
          ? parsed.last_active_started_at
          : null,
    };
  } catch {
    return { active_ms: 0, last_active_started_at: null };
  }
}

// Persist active time as best-effort local storage (no hard failure).
function writeActiveTime(sessionId: string, record: ActiveTimeRecord): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getActiveTimeKey(sessionId), JSON.stringify(record));
  } catch {
    // Best-effort only; active time is a convenience, not core data.
  }
}

// Clear local active time for completed sessions.
function clearActiveTime(sessionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(getActiveTimeKey(sessionId));
  } catch {
    // Best-effort only.
  }
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// TODO: Replace with real streaming from Anthropic's SSE endpoint. Currently this
// simulates word-by-word streaming after the full response is received, which adds
// artificial latency (~30-70ms per word). For a 200-word response this is ~10s extra.
async function* streamText(text: string, signal?: AbortSignal): AsyncGenerator<string> {
  const words = text.split(' ');
  for (let i = 0; i < words.length; i++) {
    if (signal?.aborted) return;
    yield words.slice(0, i + 1).join(' ');
    await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 40));
  }
}

// Map UI chat roles to provider-friendly message roles.
function buildLlmMessages(messages: Message[]): LlmMessage[] {
  return messages.map((message) => ({
    role: message.role === 'coach' ? 'assistant' : 'user',
    content: message.content,
  }));
}

type LlmSummaryResponse = {
  summary_text: string;
  recognition_moment: string | null;
  action_steps: string[];
  open_threads: string[];
};

// Parse LLM summary response, tolerating markdown code fences that models sometimes emit.
function parseSummaryResponse(raw: string): LlmSummaryResponse {
  const trimmed = raw.trim();
  const withoutFence = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(withoutFence) as Partial<LlmSummaryResponse>;
  if (!parsed || typeof parsed.summary_text !== 'string') {
    throw new Error('Summary response missing summary_text.');
  }
  const recognition =
    parsed.recognition_moment === null || typeof parsed.recognition_moment === 'string'
      ? parsed.recognition_moment ?? null
      : null;
  const actionSteps = Array.isArray(parsed.action_steps)
    ? parsed.action_steps.filter((step) => typeof step === 'string')
    : [];
  const openThreads = Array.isArray(parsed.open_threads)
    ? parsed.open_threads.filter((thread) => typeof thread === 'string')
    : [];

  return {
    summary_text: parsed.summary_text.trim(),
    recognition_moment: recognition?.trim() ?? null,
    action_steps: actionSteps.map((step) => step.trim()).filter(Boolean),
    open_threads: openThreads.map((thread) => thread.trim()).filter(Boolean),
  };
}

// Inner chat component (wrapped by error boundary)
function ChatPageInner() {
  const router = useRouter();
  const storageRef = React.useRef(createStorageService());
  const { isAuthed } = useAuthSessionGuard();
  const vaultMetadataRef = React.useRef<VaultMetadata | null>(null);
  const userIdRef = React.useRef<string | null>(null);
  const sessionIdRef = React.useRef<string | null>(null);
  const transcriptRef = React.useRef<SessionTranscript | null>(null);
  const sessionContextRef = React.useRef<string | null>(null);
  const lastTranscriptHashRef = React.useRef<ArrayBuffer | null>(null);
  const chunkIndexRef = React.useRef(0);
  const pendingMessagesRef = React.useRef<Message[]>([]);
  const flushTimeoutRef = React.useRef<number | null>(null);
  const isResumingRef = React.useRef(false);
  const [vaultReady, setVaultReady] = React.useState(false);
  // Storage is ready once we load or create the active transcript.
  const [storageReady, setStorageReady] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isTyping, setIsTyping] = React.useState(false);
  const [streamingContent, setStreamingContent] = React.useState<string | null>(null);
  const [showEndSessionDialog, setShowEndSessionDialog] = React.useState(false);
  const [sessionState, setSessionState] = React.useState<SessionState>('loading');
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [elapsedTime, setElapsedTime] = React.useState('');
  const [llmKeyReady, setLlmKeyReady] = React.useState(false);
  const [llmKey, setLlmKey] = React.useState<string | null>(null);
  const [llmKeyInput, setLlmKeyInput] = React.useState('');
  const [llmKeyError, setLlmKeyError] = React.useState<string | null>(null);
  const [isSavingKey, setIsSavingKey] = React.useState(false);
  const [sessionSummary, setSessionSummary] = React.useState<SessionSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = React.useState(false);
  const initialPromptSentRef = React.useRef(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const sessionDateRef = React.useRef(new Date());
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const activeMsRef = React.useRef(0);
  const activeSegmentStartRef = React.useRef<Date | null>(null);

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

    await storageRef.current.saveTranscriptChunk(chunk);
    chunkIndexRef.current += 1;
    pendingMessagesRef.current = [];

    const now = new Date().toISOString();
    const updatedTranscript = { ...transcript, updated_at: now };
    transcriptRef.current = updatedTranscript;
    await storageRef.current.saveTranscript(updatedTranscript);
  }, []);

  // Debounce chunk flushes to avoid excessive writes.
  const scheduleChunkFlush = React.useCallback(() => {
    if (flushTimeoutRef.current) {
      window.clearTimeout(flushTimeoutRef.current);
    }
    flushTimeoutRef.current = window.setTimeout(() => {
      void flushPendingMessages();
    }, 1200);
  }, [flushPendingMessages]);

  // Queue messages into a buffer that flushes to chunked storage.
  const queueMessageForChunk = React.useCallback(
    (message: Message) => {
      pendingMessagesRef.current = [...pendingMessagesRef.current, message];
      scheduleChunkFlush();
    },
    [scheduleChunkFlush],
  );

  React.useEffect(() => {
    const checkVault = async () => {
      if (!isAuthed) return;

      const metadata = await storageRef.current.getVaultMetadata();
      if (!metadata?.vault_initialized) {
        router.replace('/setup');
        return;
      }
      if (!isUnlocked()) {
        router.replace('/unlock');
        return;
      }
      const key = getKey();
      if (!key) {
        router.replace('/unlock');
        return;
      }
      vaultMetadataRef.current = metadata;
      storageRef.current.setVaultContext({ key, metadata });
      userIdRef.current = getOrCreateUserId();
      setVaultReady(true);
    };

    checkVault();
  }, [isAuthed, router]);

  React.useEffect(() => {
    if (!vaultReady) return;

    const loadProviderKey = async () => {
      try {
        const record = await storageRef.current.getLlmProviderKey(DEFAULT_PROVIDER);
        setLlmKey(record?.api_key ?? null);
      } catch {
        setLlmKey(null);
      } finally {
        setLlmKeyReady(true);
      }
    };

    loadProviderKey();
  }, [vaultReady]);

  const persistActiveTimer = React.useCallback(() => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    writeActiveTime(sessionId, {
      active_ms: activeMsRef.current,
      last_active_started_at: activeSegmentStartRef.current
        ? activeSegmentStartRef.current.toISOString()
        : null,
    });
  }, []);

  const resetActiveTimer = React.useCallback((sessionId: string) => {
    activeMsRef.current = 0;
    activeSegmentStartRef.current = null;
    setElapsedTime('');
    writeActiveTime(sessionId, { active_ms: 0, last_active_started_at: null });
  }, []);

  const loadActiveTimer = React.useCallback((sessionId: string) => {
    const record = readActiveTime(sessionId);
    activeMsRef.current = record.active_ms;
    activeSegmentStartRef.current = null;
    if (record.active_ms > 0) {
      setElapsedTime(formatElapsedTime(new Date(Date.now() - record.active_ms)));
    } else {
      setElapsedTime('');
    }
    if (record.last_active_started_at) {
      writeActiveTime(sessionId, {
        active_ms: record.active_ms,
        last_active_started_at: null,
      });
    }
  }, []);

  const startActiveSegment = React.useCallback(() => {
    if (activeSegmentStartRef.current) return;
    activeSegmentStartRef.current = new Date();
    setElapsedTime(formatElapsedTime(activeSegmentStartRef.current));
    persistActiveTimer();
  }, [persistActiveTimer]);

  const stopActiveSegment = React.useCallback(() => {
    const startedAt = activeSegmentStartRef.current;
    if (!startedAt) return;
    const now = Date.now();
    const deltaMs = now - startedAt.getTime();
    if (deltaMs > 0) {
      activeMsRef.current += deltaMs;
    }
    activeSegmentStartRef.current = null;
    setElapsedTime(
      activeMsRef.current > 0
        ? formatElapsedTime(new Date(Date.now() - activeMsRef.current))
        : '',
    );
    persistActiveTimer();
  }, [persistActiveTimer]);

  React.useEffect(() => {
    // Flush buffered messages before vault lock clears the key.
    return registerLockHandler(async () => {
      stopActiveSegment();
      setLlmKey(null);
      setLlmKeyReady(false);
      await flushPendingMessages();
    });
  }, [flushPendingMessages, stopActiveSegment]);

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

  // Check coach availability and initialize session
  const initializeSession = React.useCallback(async () => {
    setSessionState('loading');

    // Simulate checking coach availability
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Check mock toggles for testing edge states
    if (MOCK_COACH_UNAVAILABLE) {
      setSessionState('unavailable');
      return;
    }

    if (MOCK_CONNECTION_ERROR) {
      setSessionState('error');
      return;
    }

    // Coach is available, start session
    setSessionState('active');
  }, []);

  // Initialize on mount
  React.useEffect(() => {
    if (!vaultReady) return;

    initializeSession();

    // Cleanup abort controller on unmount
    return () => {
      abortControllerRef.current?.abort();
      if (flushTimeoutRef.current) {
        window.clearTimeout(flushTimeoutRef.current);
      }
    };
  }, [initializeSession, vaultReady]);

  // Update elapsed time every minute once the active timer is running.
  React.useEffect(() => {
    if (sessionState !== 'active') return;

    const updateElapsed = () => {
      const now = Date.now();
      const startedAt = activeSegmentStartRef.current;
      if (startedAt) {
        const deltaMs = now - startedAt.getTime();
        if (deltaMs > 0) {
          activeMsRef.current += deltaMs;
          activeSegmentStartRef.current = new Date(now);
        }
      }

      if (activeMsRef.current <= 0 && !activeSegmentStartRef.current) {
        setElapsedTime('');
        return;
      }

      const totalMs = activeMsRef.current;
      setElapsedTime(formatElapsedTime(new Date(now - totalMs)));
      persistActiveTimer();
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [persistActiveTimer, sessionState]);

  React.useEffect(() => {
    const handleBeforeUnload = () => {
      stopActiveSegment();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [stopActiveSegment]);

  React.useEffect(() => {
    if (sessionState === 'active') return;
    stopActiveSegment();
  }, [sessionState, stopActiveSegment]);

  React.useEffect(() => {
    if (sessionState !== 'active' || !vaultReady) return;

    const initStorageSession = async () => {
      const userId = userIdRef.current;
      if (!userId) return;

      const key = getKey();
      if (!key) return;

      const transcripts = await storageRef.current.listTranscripts(userId);
      const activeTranscript =
        transcripts.find((transcript) => transcript.ended_at === null) ?? null;

      if (activeTranscript) {
        // Resume the active transcript by replaying chunked payloads.
        isResumingRef.current = true;
        sessionIdRef.current = activeTranscript.session_id;
        transcriptRef.current = activeTranscript;
        sessionDateRef.current = new Date(activeTranscript.started_at);
        loadActiveTimer(activeTranscript.session_id);

        const chunks = await storageRef.current.listTranscriptChunks(activeTranscript.session_id);
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
          setMessages(restoredMessages);
          const hasCoachMessage = restoredMessages.some((message) => message.role === 'coach');
          if (hasCoachMessage) {
            startActiveSegment();
          }
        }
        setStorageReady(true);
        sessionContextRef.current = await buildSessionContext({
          storage: storageRef.current,
          userId,
          key,
          options: { modelId: DEFAULT_MODEL_ID },
        });
        console.info('context assembly complete', {
          context_chars: sessionContextRef.current.length,
          model_id: DEFAULT_MODEL_ID,
        });
        return;
      }

      // Start a new transcript and mark it active.
      const sessionNumber = await getSessionNumber(storageRef.current, userId);
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
      transcriptRef.current = transcript;
      chunkIndexRef.current = 0;
      initialPromptSentRef.current = false;
      sessionDateRef.current = now;
      resetActiveTimer(sessionId);
      await storageRef.current.saveTranscript(transcript);
      await enqueueSessionStart(sessionId);
      void flushSessionOutbox();
      setStorageReady(true);
      // Build context once per session start/resume; reuse for the full session.
      sessionContextRef.current = await buildSessionContext({
        storage: storageRef.current,
        userId,
        key,
        options: { modelId: DEFAULT_MODEL_ID },
      });
      console.info('context assembly complete', {
        context_chars: sessionContextRef.current.length,
        model_id: DEFAULT_MODEL_ID,
      });
    };

    initStorageSession();
  }, [sessionState, vaultReady]);

  // Send the initial coach greeting when starting a fresh session.
  // Guard conditions prevent re-sending on resume or after messages exist.
  // On error, initialPromptSentRef resets so the effect can retry on next key change.
  React.useEffect(() => {
    if (sessionState !== 'active' || !vaultReady || !storageReady) return;
    if (!llmKey) return;
    if (isResumingRef.current || messages.length > 0) return;
    if (initialPromptSentRef.current) return;

    initialPromptSentRef.current = true;
    abortControllerRef.current = new AbortController();
    setIsTyping(true);
    setStreamingContent('');

    const sendInitialPrompt = async () => {
      try {
        const sessionNumber = transcriptRef.current?.session_number ?? 1;
        const systemPrompt = buildSystemPrompt({
          sessionNumber,
          sessionContext: sessionContextRef.current ?? '',
        });
        const responseText = await callLlmWithRetry({
          apiKey: llmKey,
          modelId: DEFAULT_MODEL_ID,
          systemPrompt,
          messages: [{ role: 'user', content: INITIAL_COACH_INSTRUCTION }],
          signal: abortControllerRef.current?.signal,
        });

        for await (const partial of streamText(responseText, abortControllerRef.current?.signal)) {
          setStreamingContent(partial);
        }

        const coachMessage: Message = {
          id: generateId(),
          role: 'coach',
          content: responseText,
          timestamp: new Date(),
        };
        setMessages([coachMessage]);
        startActiveSegment();
        queueMessageForChunk(coachMessage);
      } catch (error) {
        initialPromptSentRef.current = false;
        if (error instanceof LlmAbortError) {
          return;
        }
        if (error instanceof LlmInvalidKeyError) {
          setLlmKey(null);
          setLlmKeyError(error.message);
          return;
        }
        if (error instanceof LlmUnavailableError) {
          setSessionState('unavailable');
        } else {
          setSessionState('error');
        }
      } finally {
        setIsTyping(false);
        setStreamingContent(null);
        abortControllerRef.current = null;
      }
    };

    void sendInitialPrompt();
  }, [
    llmKey,
    messages.length,
    queueMessageForChunk,
    sessionState,
    startActiveSegment,
    storageReady,
    vaultReady,
  ]);

  React.useEffect(() => {
    if (!storageReady) return;
    if (pendingMessagesRef.current.length === 0) return;
    scheduleChunkFlush();
  }, [scheduleChunkFlush, storageReady]);

  // Retry handler for unavailable state
  const handleRetry = React.useCallback(async () => {
    setIsRetrying(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsRetrying(false);
    initializeSession();
  }, [initializeSession]);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, isTyping]);

  // Persist the provider key in encrypted storage for this vault.
  const handleSaveKey = React.useCallback(async () => {
    if (!llmKeyInput.trim()) {
      setLlmKeyError('Enter a valid token.');
      return;
    }

    setIsSavingKey(true);
    setLlmKeyError(null);
    try {
      // Verify token before persisting it to the vault.
      await callLlmWithRetry({
        apiKey: llmKeyInput.trim(),
        modelId: DEFAULT_MODEL_ID,
        systemPrompt: '',
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        maxTokens: 4,
        temperature: 0,
      });

      const now = new Date().toISOString();
      const record: LlmProviderKey = {
        provider: DEFAULT_PROVIDER,
        api_key: llmKeyInput.trim(),
        created_at: now,
        updated_at: now,
      };
      await storageRef.current.saveLlmProviderKey(record);
      setLlmKey(record.api_key);
      setLlmKeyInput('');
    } catch (error) {
      if (error instanceof LlmAbortError) {
        return;
      }
      if (error instanceof LlmInvalidKeyError) {
        setLlmKeyError(error.message);
      } else if (error instanceof LlmUnavailableError) {
        setLlmKeyError('Provider is unavailable. Try again in a moment.');
      } else if (error instanceof Error) {
        setLlmKeyError(error.message);
      } else {
        setLlmKeyError('Could not verify the token. Try again.');
      }
    } finally {
      setIsSavingKey(false);
    }
  }, [llmKeyInput]);

  // Handle sending a message
  const handleSend = React.useCallback(
    async (content: string) => {
      // Add user message
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: new Date(),
      };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      queueMessageForChunk(userMessage);

      // Show typing indicator
      setIsTyping(true);

      // Brief pause for a natural response cadence.
      await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 300));

      if (!llmKey) {
        setIsTyping(false);
        setLlmKeyError('Add your token to continue.');
        return;
      }

      const sessionNumber = transcriptRef.current?.session_number ?? 1;
      const systemPrompt = buildSystemPrompt({
        sessionNumber,
        sessionContext: sessionContextRef.current ?? '',
      });
      const modelMessages = buildLlmMessages(nextMessages);

      // Create abort controller for this request + stream
      abortControllerRef.current = new AbortController();

      let responseText = '';
      try {
        responseText = await callLlmWithRetry(
          {
            apiKey: llmKey,
            modelId: DEFAULT_MODEL_ID,
            systemPrompt,
            messages: modelMessages,
            signal: abortControllerRef.current.signal,
          },
          2,
        );
      } catch (error) {
        setIsTyping(false);
        setStreamingContent(null);
        abortControllerRef.current = null;
        if (error instanceof LlmAbortError) {
          return;
        }
        if (error instanceof LlmInvalidKeyError) {
          setLlmKey(null);
          setLlmKeyError(error.message);
          return;
        }
        if (error instanceof LlmUnavailableError) {
          setSessionState('unavailable');
        } else {
          setSessionState('error');
        }
        return;
      }

      // Hide typing indicator, start streaming
      setIsTyping(false);
      setStreamingContent('');

      try {
        for await (const partial of streamText(responseText, abortControllerRef.current.signal)) {
          setStreamingContent(partial);
        }

        // Finalize the message
        const coachMessage: Message = {
          id: generateId(),
          role: 'coach',
          content: responseText,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, coachMessage]);
        startActiveSegment();
        queueMessageForChunk(coachMessage);
      } finally {
        setStreamingContent(null);
        abortControllerRef.current = null;
      }
    },
    [llmKey, messages, queueMessageForChunk, startActiveSegment],
  );

  // Handle end session
  const handleEndSession = React.useCallback(() => {
    setShowEndSessionDialog(true);
  }, []);

  const confirmEndSession = React.useCallback(async () => {
    // Abort any ongoing streaming
    abortControllerRef.current?.abort();
    setShowEndSessionDialog(false);

    await flushPendingMessages();
    stopActiveSegment();

    const transcript = transcriptRef.current;
    if (transcript) {
      const now = new Date().toISOString();
      const updatedTranscript = { ...transcript, ended_at: now, updated_at: now };
      transcriptRef.current = updatedTranscript;
      await storageRef.current.saveTranscript(updatedTranscript);
    }

    const userId = userIdRef.current;
    const sessionId = sessionIdRef.current;
    const now = new Date().toISOString();
    const messagesSnapshot = [...messages];
    if (userId && sessionId) {
      const profile = await storageRef.current.getProfile(userId);
      if (profile) {
        await storageRef.current.saveProfile({ ...profile, updated_at: now });
      }
    }

    if (sessionId) {
      const transcriptHash = lastTranscriptHashRef.current;
      if (transcriptHash) {
        await enqueueSessionEnd(sessionId, arrayBufferToHex(transcriptHash));
        void flushSessionOutbox();
      }
    }

    setSessionState('complete');
    if (sessionId) {
      clearActiveTime(sessionId);
    }

    if (userId && sessionId && llmKey) {
      setIsSummaryLoading(true);
      const sessionNumber = transcriptRef.current?.session_number ?? 1;
      const systemPrompt = buildSystemPrompt({
        sessionNumber,
        sessionContext: sessionContextRef.current ?? '',
      });
      // Ask the LLM for a structured session summary.
      const summaryPrompt = [
        'Summarize this session as JSON with the following keys:',
        'summary_text (string), recognition_moment (string), action_steps (string[]), open_threads (string[]).',
        'Recognition moment definition: the single most important pattern, insight, or shift that the user should carry forward into the week.',
        'Keep summary_text concise (8-12 lines max).',
        'Return JSON only, no markdown.',
      ].join('\n');

      void (async () => {
        try {
          const summaryText = await callLlmWithRetry({
            apiKey: llmKey,
            modelId: DEFAULT_MODEL_ID,
            systemPrompt,
            messages: [
              ...buildLlmMessages(messagesSnapshot),
              { role: 'user', content: summaryPrompt },
            ],
            temperature: 0.2,
            maxTokens: 800,
          });
          const parsed = parseSummaryResponse(summaryText);
          const summary: SessionSummary = {
            session_id: sessionId,
            user_id: userId,
            summary_text: parsed.summary_text,
            recognition_moment: parsed.recognition_moment,
            action_steps: parsed.action_steps,
            open_threads: parsed.open_threads,
            coach_notes: null,
            created_at: now,
            updated_at: now,
          };
          await storageRef.current.saveSummary(summary);
          setSessionSummary(summary);
        } catch {
          // Keep closure UI available even if summary generation fails.
        } finally {
          setIsSummaryLoading(false);
        }
      })();
    }
  }, [flushPendingMessages, llmKey, messages]);

  // Loading state
  if (!vaultReady || sessionState === 'loading') {
    return (
      <div className="atmosphere min-h-screen flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-6"
        >
          <div className="w-12 h-12 rounded-full border-2 border-accent/30 border-t-accent animate-spin mx-auto" />
          <div className="space-y-2">
            <p className="text-foreground font-medium">Connecting to your coach</p>
            <p className="text-sm text-muted-foreground">Just a moment...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Coach unavailable state
  if (sessionState === 'unavailable') {
    return <CoachUnavailable onRetry={handleRetry} isRetrying={isRetrying} />;
  }

  // Error state (connection or other errors)
  if (sessionState === 'error') {
    return (
      <div className="atmosphere min-h-screen flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-6 max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Shield className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            <h1 className="font-display text-2xl text-foreground">Connection interrupted</h1>
            <p className="text-muted-foreground">
              We couldn&apos;t establish a secure connection. Your data is safe.
            </p>
          </div>
          <Button onClick={handleRetry} disabled={isRetrying} className="h-12 px-8">
            {isRetrying ? 'Reconnecting...' : 'Try again'}
          </Button>
        </motion.div>
      </div>
    );
  }

  // Show session closure when complete
  if (sessionState === 'complete') {
    return (
      <SessionClosure
        sessionDate={sessionDateRef.current}
        recognitionMoment={sessionSummary?.recognition_moment ?? null}
        actionSteps={sessionSummary?.action_steps ?? []}
        isSummaryLoading={isSummaryLoading}
      />
    );
  }

  const showProviderGate = sessionState === 'active' && storageReady && llmKeyReady && !llmKey;

  return (
    <div className="atmosphere h-screen flex flex-col overflow-hidden">
      {/* Hamburger menu - top left */}
      <div className="fixed top-4 left-4" style={{ zIndex: Z_INDEX.navigation }}>
        <Sidebar />
      </div>

      {/* End Session button - top right */}
      {!showProviderGate && (
        <div className="fixed top-4 right-4" style={{ zIndex: Z_INDEX.navigation }}>
          <Button variant="outline" onClick={handleEndSession} className="text-base text-foreground">
            End Session
          </Button>
        </div>
      )}

      {/* Title - centered */}
      <div className="pt-16 pb-4 text-center">
        <h1 className="font-display text-lg text-foreground">
          Session · {formatSessionDate(sessionDateRef.current)}
        </h1>
        {elapsedTime && <p className="text-xs text-muted-foreground/60 mt-1">{elapsedTime}</p>}
      </div>

      {/* Messages area */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {showProviderGate ? (
          <div className="h-full flex items-center justify-center px-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-md rounded-2xl border border-border/60 bg-background/80 backdrop-blur-md p-6 shadow-sm"
            >
              <div className="space-y-3 text-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <h1 className="font-display text-xl text-foreground">Connect your provider</h1>
                <p className="text-sm text-muted-foreground">
                  To begin your session, add your Claude Code OAuth token (sk-ant-oat...) to
                  begin chatting.
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <Input
                  type="password"
                  placeholder="sk-ant-oat..."
                  value={llmKeyInput}
                  onChange={(event) => {
                    setLlmKeyInput(event.target.value);
                    if (llmKeyError) {
                      setLlmKeyError(null);
                    }
                  }}
                />
                {llmKeyError && <p className="text-xs text-destructive">{llmKeyError}</p>}
                <Button
                  className="w-full h-11"
                  onClick={handleSaveKey}
                  disabled={isSavingKey || llmKeyInput.trim().length === 0}
                >
                  {isSavingKey ? 'Verifying...' : 'Verify & Save Token'}
                </Button>
              </div>
            </motion.div>
          </div>
        ) : (
          <div ref={scrollAreaRef} className="h-full chat-scroll-area">
            <div className="max-w-3xl mx-auto px-6 py-8 min-h-[calc(100%+24px)]">
              {/* Empty state before first message */}
              {messages.length === 0 && !isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-accent" />
                  </div>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    Your session is beginning...
                  </p>
                </motion.div>
              )}

              {/* Message list */}
              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {messages.map((message) =>
                    message.role === 'coach' ? (
                      <CoachMessage key={message.id} content={message.content} />
                    ) : (
                      <UserMessage key={message.id} content={message.content} />
                    ),
                  )}

                  {/* Streaming message */}
                  {streamingContent !== null && (
                    <CoachMessage key="streaming" content={streamingContent} />
                  )}

                  {/* Typing indicator */}
                  {isTyping && <TypingIndicator key="typing" />}
                </AnimatePresence>
              </div>

              {/* Scroll anchor */}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>
        )}
      </main>

      {/* Input area */}
      <footer className="sticky bottom-0" style={{ zIndex: Z_INDEX.sticky }}>
        {/* Gradient fade for smooth transition */}
        <div
          className="absolute inset-x-0 -top-16 h-16 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)',
          }}
        />
        <div className="relative bg-background/80 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-6 pt-4 pb-6">
            <ChatInput
              onSend={handleSend}
              disabled={
                !storageReady ||
                !llmKeyReady ||
                !llmKey ||
                isTyping ||
                streamingContent !== null
              }
              placeholder="Reply..."
            />
            <p className="mt-3 text-xs text-muted-foreground/50 text-center">
              Enter to send · Shift+Enter for new line · Lumen is AI-powered and can make mistakes
            </p>
          </div>
        </div>
      </footer>

      {/* End Session Dialog */}
      <AnimatePresence>
        {showEndSessionDialog && (
          <EndSessionDialog
            onConfirm={confirmEndSession}
            onCancel={() => setShowEndSessionDialog(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Main export with error boundary wrapper
export default function ChatPage() {
  return (
    <ErrorBoundary>
      <ChatPageInner />
    </ErrorBoundary>
  );
}
