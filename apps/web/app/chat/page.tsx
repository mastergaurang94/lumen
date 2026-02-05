'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/sidebar';
import { ErrorBoundary } from '@/components/error-boundary';
import { CoachUnavailable } from '@/components/coach-unavailable';
import { SessionClosure, EndSessionDialog } from '@/components/chat';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChatBody } from '@/components/chat/chat-body';
import { ChatFooter } from '@/components/chat/chat-footer';
import { Z_INDEX } from '@/lib/z-index';
import { arrayBufferToHex } from '@/lib/crypto';
import { registerLockHandler } from '@/lib/crypto/key-context';
import { useActiveTimer } from '@/lib/hooks/use-active-timer';
import { useAuthSessionGuard } from '@/lib/hooks/use-auth-session-guard';
import { useLlmConversation } from '@/lib/hooks/use-llm-conversation';
import { useSessionLifecycle } from '@/lib/hooks/use-session-lifecycle';
import { enqueueSessionEnd, flushSessionOutbox } from '@/lib/outbox/session-outbox';
import { createStorageService } from '@/lib/storage/dexie-storage';
import {
  callLlmWithRetry,
  LlmAbortError,
  LlmInvalidKeyError,
  LlmUnavailableError,
} from '@/lib/llm/client';
import { DEFAULT_MODEL_ID, DEFAULT_PROVIDER } from '@/lib/llm/model-config';
import { buildSystemPrompt } from '@/lib/llm/prompts';
import { buildLlmMessages } from '@/lib/session/messages';
import { parseSummaryResponse, SUMMARY_PROMPT } from '@/lib/session/summary';
import type { LlmProviderKey, SessionSummary } from '@/types/storage';
import type { Message, SessionState } from '@/types/session';

// Inner chat component (wrapped by error boundary)
function ChatPageInner() {
  const router = useRouter();
  const storageRef = React.useRef(createStorageService());
  const { isAuthed } = useAuthSessionGuard();
  const [sessionState, setSessionState] = React.useState<SessionState>('loading');
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [showEndSessionDialog, setShowEndSessionDialog] = React.useState(false);
  const [llmKeyReady, setLlmKeyReady] = React.useState(false);
  const [llmKey, setLlmKey] = React.useState<string | null>(null);
  const [llmKeyInput, setLlmKeyInput] = React.useState('');
  const [llmKeyError, setLlmKeyError] = React.useState<string | null>(null);
  const [isSavingKey, setIsSavingKey] = React.useState(false);
  const [sessionSummary, setSessionSummary] = React.useState<SessionSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const {
    elapsedTime,
    startActiveSegment,
    stopActiveSegment,
    loadActiveTimer,
    resetActiveTimer,
    clearActiveTimer,
  } = useActiveTimer({ sessionId: activeSessionId, isSessionActive: sessionState === 'active' });
  // Stabilize callbacks to prevent effect re-runs in useSessionLifecycle.
  const handleMessagesRestored = React.useCallback((restored: Message[]) => {
    setMessages(restored);
  }, []);
  const handleResumeHasCoachMessage = React.useCallback(() => {
    startActiveSegment();
  }, [startActiveSegment]);
  const handleResumeActiveTimer = React.useCallback(
    (restoredSessionId: string) => {
      setActiveSessionId(restoredSessionId);
      loadActiveTimer(restoredSessionId);
    },
    [loadActiveTimer],
  );
  const handleNewSessionActiveTimer = React.useCallback(
    (newSessionId: string) => {
      setActiveSessionId(newSessionId);
      resetActiveTimer(newSessionId);
    },
    [resetActiveTimer],
  );

  const {
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
    lastTranscriptHashRef,
    flushPendingMessages,
    queueMessageForChunk,
  } = useSessionLifecycle({
    storage: storageRef.current,
    router,
    isAuthed,
    sessionState,
    setSessionState,
    onMessagesRestored: handleMessagesRestored,
    onResumeHasCoachMessage: handleResumeHasCoachMessage,
    onResumeActiveTimer: handleResumeActiveTimer,
    onNewSessionActiveTimer: handleNewSessionActiveTimer,
  });
  const { isTyping, streamingContent, handleSend, abortConversation } = useLlmConversation({
    messages,
    setMessages,
    sessionId,
    sessionState,
    vaultReady,
    storageReady,
    llmKey,
    sessionContextRef,
    transcriptRef,
    queueMessageForChunk,
    startActiveSegment,
    onMissingKey: () => setLlmKeyError('Add your token to continue.'),
    onInvalidKey: (message) => {
      setLlmKey(null);
      setLlmKeyError(message);
    },
    onUnavailable: () => setSessionState('unavailable'),
    onError: () => setSessionState('error'),
  });

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

  React.useEffect(() => {
    // Flush buffered messages before vault lock clears the key.
    return registerLockHandler(async () => {
      stopActiveSegment();
      setLlmKey(null);
      setLlmKeyReady(false);
      await flushPendingMessages();
    });
  }, [flushPendingMessages, stopActiveSegment]);

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

  // Handle end session
  const handleEndSession = React.useCallback(() => {
    setShowEndSessionDialog(true);
  }, []);

  const confirmEndSession = React.useCallback(async () => {
    // Abort any ongoing streaming
    abortConversation();
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
      clearActiveTimer(sessionId);
    }

    if (userId && sessionId && llmKey) {
      setIsSummaryLoading(true);
      const sessionNumber = transcriptRef.current?.session_number ?? 1;
      const systemPrompt = buildSystemPrompt({
        sessionNumber,
        sessionContext: sessionContextRef.current ?? '',
      });
      // Ask the LLM for a structured session summary.
      void (async () => {
        try {
          const summaryText = await callLlmWithRetry({
            apiKey: llmKey,
            modelId: DEFAULT_MODEL_ID,
            systemPrompt,
            messages: [
              ...buildLlmMessages(messagesSnapshot),
              { role: 'user', content: SUMMARY_PROMPT },
            ],
            temperature: 0.2,
            maxTokens: 800,
          });
          let parsed;
          try {
            parsed = parseSummaryResponse(summaryText);
          } catch (parseError) {
            console.error('Summary JSON parse failed. Raw response:', summaryText.slice(0, 500));
            throw parseError;
          }
          const summary: SessionSummary = {
            session_id: sessionId,
            user_id: userId,
            summary_text: parsed.summary_text,
            parting_words: parsed.parting_words,
            action_steps: parsed.action_steps,
            open_threads: parsed.open_threads,
            coach_notes: null,
            created_at: now,
            updated_at: now,
          };
          await storageRef.current.saveSummary(summary);
          setSessionSummary(summary);
        } catch (error) {
          console.error('Failed to generate session summary', error);
        } finally {
          setIsSummaryLoading(false);
        }
      })();
    }
  }, [
    abortConversation,
    clearActiveTimer,
    flushPendingMessages,
    llmKey,
    messages,
    stopActiveSegment,
  ]);

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
        partingWords={sessionSummary?.parting_words ?? null}
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

      {/* Wrap up button - top right */}
      {!showProviderGate && (
        <div className="fixed top-4 right-4" style={{ zIndex: Z_INDEX.navigation }}>
          <Button
            variant="outline"
            onClick={handleEndSession}
            className="text-base text-foreground"
          >
            Wrap up
          </Button>
        </div>
      )}

      {/* Title - centered */}
      <ChatHeader sessionDate={sessionDateRef.current} elapsedTime={elapsedTime} />

      {/* Messages area */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <ChatBody
          showProviderGate={showProviderGate}
          llmKeyInput={llmKeyInput}
          llmKeyError={llmKeyError}
          isSavingKey={isSavingKey}
          onKeyChange={(value: string) => {
            setLlmKeyInput(value);
            if (llmKeyError) {
              setLlmKeyError(null);
            }
          }}
          onKeySubmit={handleSaveKey}
          messages={messages}
          isTyping={isTyping}
          streamingContent={streamingContent}
          scrollAreaRef={scrollAreaRef}
          messagesEndRef={messagesEndRef}
        />
      </main>

      {/* Input area */}
      <ChatFooter
        onSend={handleSend}
        disabled={!storageReady || !llmKeyReady || !llmKey || isTyping || streamingContent !== null}
      />

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
