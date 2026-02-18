'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from '@/components/error-boundary';
import { LumenUnavailable } from '@/components/lumen-unavailable';
import { SessionClosure, EndSessionDialog } from '@/components/chat';
import { ChatTopBar } from '@/components/chat/chat-top-bar';
import { ChatBody, type SpacerControl } from '@/components/chat/chat-body';
import { ChatFooter } from '@/components/chat/chat-footer';
import { ChatErrorState, ChatLoadingState } from '@/components/chat/chat-page-states';
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
import { NOTEBOOK_PROMPT, extractClosureFields } from '@/lib/session/summary';
import {
  ARC_CREATION_PROMPT,
  ARC_UPDATE_PROMPT,
  buildArcCreationMessages,
  buildArcUpdateMessages,
} from '@/lib/session/arc';
import type { LlmProviderKey, SessionNotebook } from '@/types/storage';
import type { ClosureStep, Message, SessionState } from '@/types/session';

// When true, the server injects the LLM token — skip client-side key management.
const LLM_SERVER_MODE = process.env.NEXT_PUBLIC_LLM_SERVER_MODE === 'true';
const CLOSURE_LLM_TIMEOUT_MS = 120_000;
const REFLECTING_INTRO_MIN_MS = 1800;
const REFLECTING_NOTEBOOK_MIN_MS = 2500;
const REFLECTING_ALMOST_DONE_MIN_MS = 700;

type ReflectingStage = 'intro' | 'notebook' | 'arc' | 'almost-done';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Inner chat component (wrapped by error boundary)
function ChatPageInner() {
  const router = useRouter();
  const storageRef = React.useRef(createStorageService());
  const { isAuthed, session } = useAuthSessionGuard();
  const [sessionState, setSessionState] = React.useState<SessionState>('loading');
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [showEndSessionDialog, setShowEndSessionDialog] = React.useState(false);
  const [llmKeyReady, setLlmKeyReady] = React.useState(false);
  const [llmKey, setLlmKey] = React.useState<string | null>(null);
  const [llmKeyInput, setLlmKeyInput] = React.useState('');
  const [llmKeyError, setLlmKeyError] = React.useState<string | null>(null);
  const [isSavingKey, setIsSavingKey] = React.useState(false);
  const [sessionNotebook, setSessionNotebook] = React.useState<SessionNotebook | null>(null);
  const [summaryError, setSummaryError] = React.useState<string | null>(null);
  const [isRetryingSummary, setIsRetryingSummary] = React.useState(false);
  const [closureStep, setClosureStep] = React.useState<ClosureStep>('wrapping-up');
  const [reflectingDetail, setReflectingDetail] = React.useState<string | null>(null);
  const reflectingStageRef = React.useRef<{ stage: ReflectingStage; startedAt: number }>({
    stage: 'intro',
    startedAt: 0,
  });
  const headerRef = React.useRef<HTMLElement>(null);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const spacerControlRef = React.useRef<SpacerControl | null>(null);
  const previousMessageCountRef = React.useRef(0);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [compactLandscapeLayout, setCompactLandscapeLayout] = React.useState(false);
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
  const handleResumeHasLumenMessage = React.useCallback(() => {
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
    authenticatedUserId: session?.user_id ?? null,
    sessionState,
    setSessionState,
    onMessagesRestored: handleMessagesRestored,
    onResumeHasLumenMessage: handleResumeHasLumenMessage,
    onResumeActiveTimer: handleResumeActiveTimer,
    onNewSessionActiveTimer: handleNewSessionActiveTimer,
  });
  const {
    isTyping,
    streamingContent,
    streamInterruptedPartial,
    clearStreamInterruption,
    retryLastResponse,
    handleSend,
    abortConversation,
  } = useLlmConversation({
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
    onError: () => {
      if (LLM_SERVER_MODE) {
        setLlmKey(null);
        setLlmKeyError('Server token unavailable. Add a token to continue.');
        setSessionState('active');
        return;
      }
      setSessionState('error');
    },
  });

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(
      '(max-width: 950px) and (max-height: 500px) and (orientation: landscape)',
    );
    const update = () => setCompactLandscapeLayout(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  React.useEffect(() => {
    document.documentElement.classList.add('chat-shell-active');
    document.body.classList.add('chat-shell-active');
    return () => {
      document.documentElement.classList.remove('chat-shell-active');
      document.body.classList.remove('chat-shell-active');
    };
  }, []);

  React.useEffect(() => {
    if (!vaultReady) return;

    // In server mode the LLM key lives on the server — skip IndexedDB.
    if (LLM_SERVER_MODE) {
      setLlmKey('server-managed');
      setLlmKeyReady(true);
      return;
    }

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

  // Scroll behavior — the user owns the scroll position:
  //
  // The only auto-scroll is when the user sends a message: we pin their message
  // to the top of the viewport so the full visible area is available for the
  // response to grow into. Everything else (streaming, finalization) is hands-off.
  //
  // The spacer is inflated to 100vh before scrolling so the browser has enough
  // scroll room to place the message at the top. The spacer then enters
  // "recovering" mode and gradually shrinks as the response streams in — no
  // abrupt jump because it only deflates as new content fills the gap.
  React.useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const hasNewMessage = messages.length > previousMessageCountRef.current;
    previousMessageCountRef.current = messages.length;

    if (!hasNewMessage) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'user') {
      requestAnimationFrame(() => {
        const els = scrollArea.querySelectorAll('[data-message-role="user"]');
        const el = els[els.length - 1] as HTMLElement | null;
        if (el) {
          const containerTop = scrollArea.getBoundingClientRect().top;
          const elTop = el.getBoundingClientRect().top;
          // Offset by the fixed header height (+ small gap) so the message
          // pins just below the header, not behind it.
          const headerOffset = (headerRef.current?.offsetHeight ?? 0) + 8;
          const target = Math.max(0, scrollArea.scrollTop + (elTop - containerTop) - headerOffset);

          // Inflate the spacer with the scroll target so recovering mode
          // knows the ceiling — prevents ResizeObserver from shrinking the
          // spacer below what the smooth scroll animation needs.
          spacerControlRef.current?.inflate(target);

          scrollArea.scrollTo({ top: target, behavior: 'smooth' });
        }
      });
    }
  }, [messages]);

  // Persist the provider key in encrypted storage for this vault.
  const handleSaveKey = React.useCallback(async () => {
    if (!llmKeyInput.trim()) {
      setLlmKeyError('Enter a valid token.');
      return;
    }

    setIsSavingKey(true);
    setLlmKeyError(null);
    const skipValidation =
      typeof window !== 'undefined' &&
      (window as unknown as { __E2E_SKIP_LLM_VALIDATION__?: boolean })
        .__E2E_SKIP_LLM_VALIDATION__ === true;
    try {
      if (!skipValidation) {
        // Verify token before persisting it to the vault.
        await callLlmWithRetry({
          apiKey: llmKeyInput.trim(),
          modelId: DEFAULT_MODEL_ID,
          systemPrompt: '',
          messages: [{ role: 'user', content: 'Reply with OK.' }],
          maxTokens: 4,
          temperature: 0,
        });
      }

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

  const markReflectingStage = React.useCallback((stage: ReflectingStage, detail: string | null) => {
    reflectingStageRef.current = { stage, startedAt: Date.now() };
    setReflectingDetail(detail);
  }, []);

  const ensureReflectingStageVisible = React.useCallback(
    async (stage: ReflectingStage, minVisibleMs: number) => {
      if (reflectingStageRef.current.stage !== stage) return;
      const elapsed = Date.now() - reflectingStageRef.current.startedAt;
      if (elapsed < minVisibleMs) {
        await sleep(minVisibleMs - elapsed);
      }
    },
    [],
  );

  const generateNotebookAndArc = React.useCallback(
    async ({
      userId,
      sessionIdValue,
      messagesSnapshot,
      nowIso,
    }: {
      userId: string;
      sessionIdValue: string;
      messagesSnapshot: Message[];
      nowIso: string;
    }) => {
      if (!llmKey) {
        throw new Error('LLM key missing');
      }
      const sessionNumber = transcriptRef.current?.session_number ?? 1;
      const systemPrompt = buildSystemPrompt({
        sessionNumber,
        sessionContext: sessionContextRef.current ?? '',
      });
      const transcriptText = messagesSnapshot
        .map((m) => `**${m.role}:** ${m.content}`)
        .join('\n\n');

      // Step 1: Generate the Session Notebook (markdown)
      await ensureReflectingStageVisible('intro', REFLECTING_INTRO_MIN_MS);
      markReflectingStage('notebook', 'Writing session notebook');
      const notebookMarkdown = await callLlmWithRetry({
        apiKey: llmKey,
        modelId: DEFAULT_MODEL_ID,
        systemPrompt,
        messages: [
          ...buildLlmMessages(messagesSnapshot),
          { role: 'user', content: NOTEBOOK_PROMPT },
        ],
        maxTokens: 4096,
        timeoutMs: CLOSURE_LLM_TIMEOUT_MS,
      });

      const notebook: SessionNotebook = {
        session_id: sessionIdValue,
        user_id: userId,
        session_number: sessionNumber,
        markdown: notebookMarkdown.trim(),
        created_at: nowIso,
        updated_at: nowIso,
      };
      await storageRef.current.saveNotebook(notebook);

      // Step 3: Generate/update the Arc
      try {
        const existingArc = await storageRef.current.getArc(userId);
        await ensureReflectingStageVisible('notebook', REFLECTING_NOTEBOOK_MIN_MS);
        markReflectingStage('arc', existingArc ? 'Updating your Arc' : 'Creating your Arc');

        let arcMarkdown: string;
        if (!existingArc) {
          // First session — create the Arc
          arcMarkdown = await callLlmWithRetry({
            apiKey: llmKey,
            modelId: DEFAULT_MODEL_ID,
            systemPrompt: ARC_CREATION_PROMPT,
            messages: buildArcCreationMessages(transcriptText, notebookMarkdown),
            maxTokens: 4096,
            timeoutMs: CLOSURE_LLM_TIMEOUT_MS,
          });
        } else {
          // Update the Arc with new understanding
          arcMarkdown = await callLlmWithRetry({
            apiKey: llmKey,
            modelId: DEFAULT_MODEL_ID,
            systemPrompt: ARC_UPDATE_PROMPT,
            messages: buildArcUpdateMessages(
              existingArc.arc_markdown,
              transcriptText,
              notebookMarkdown,
              sessionNumber,
            ),
            maxTokens: 4096,
            timeoutMs: CLOSURE_LLM_TIMEOUT_MS,
          });
        }

        await storageRef.current.saveArc({
          user_id: userId,
          arc_markdown: arcMarkdown.trim(),
          last_session_number: sessionNumber,
          version: (existingArc?.version ?? 0) + 1,
          created_at: existingArc?.created_at ?? nowIso,
          updated_at: nowIso,
        });
      } catch (arcError) {
        // Arc failure is non-fatal — notebook is saved, arc will catch up next time.
        console.error('Failed to generate/update Arc (notebook saved successfully)', arcError);
      }

      markReflectingStage('almost-done', 'Almost done');
      await ensureReflectingStageVisible('almost-done', REFLECTING_ALMOST_DONE_MIN_MS);

      return notebook;
    },
    [ensureReflectingStageVisible, llmKey, markReflectingStage, sessionContextRef, transcriptRef],
  );

  const confirmEndSession = React.useCallback(async () => {
    const MIN_STEP_MS = 600;

    // Show closure screen immediately
    abortConversation();
    setShowEndSessionDialog(false);
    setClosureStep('wrapping-up');
    setReflectingDetail(null);
    setSummaryError(null);
    setIsRetryingSummary(false);
    setSessionState('complete');

    // Step 1: Wrapping up — flush and stop
    const wrapStart = Date.now();
    await flushPendingMessages();
    stopActiveSegment();
    const wrapElapsed = Date.now() - wrapStart;
    if (wrapElapsed < MIN_STEP_MS) {
      await new Promise((r) => setTimeout(r, MIN_STEP_MS - wrapElapsed));
    }

    // Step 2: Storing locally — save transcript, profile, metadata
    setClosureStep('storing');
    const storeStart = Date.now();
    const now = new Date().toISOString();
    const messagesSnapshot = [...messages];

    const transcript = transcriptRef.current;
    if (transcript) {
      const updatedTranscript = { ...transcript, ended_at: now, updated_at: now };
      transcriptRef.current = updatedTranscript;
      await storageRef.current.saveTranscript(updatedTranscript);
    }

    const userId = userIdRef.current;
    const sid = sessionIdRef.current;

    if (userId && sid) {
      const profile = await storageRef.current.getProfile(userId);
      if (profile) {
        await storageRef.current.saveProfile({ ...profile, updated_at: now });
      }
    }

    if (sid) {
      const transcriptHash = lastTranscriptHashRef.current;
      if (transcriptHash) {
        await enqueueSessionEnd(sid, arrayBufferToHex(transcriptHash));
        void flushSessionOutbox();
      }
      clearActiveTimer(sid);
    }

    const storeElapsed = Date.now() - storeStart;
    if (storeElapsed < MIN_STEP_MS) {
      await new Promise((r) => setTimeout(r, MIN_STEP_MS - storeElapsed));
    }

    // Step 3: Reflecting — notebook + arc generation (the slow step)
    if (userId && sid && llmKey) {
      setClosureStep('reflecting');
      markReflectingStage('intro', null);
      try {
        const notebook = await generateNotebookAndArc({
          userId,
          sessionIdValue: sid,
          messagesSnapshot,
          nowIso: now,
        });
        setSessionNotebook(notebook);
        setSummaryError(null);
      } catch (error) {
        console.error('Failed to generate session notebook', error);
        setSummaryError(
          "I wasn't able to capture a full reflection this time, but your conversation is saved.",
        );
      }
    }

    // Step 4: Done — always reached
    setClosureStep('done');
    reflectingStageRef.current = { stage: 'intro', startedAt: 0 };
    setReflectingDetail(null);
  }, [
    abortConversation,
    clearActiveTimer,
    flushPendingMessages,
    generateNotebookAndArc,
    llmKey,
    markReflectingStage,
    messages,
    stopActiveSegment,
  ]);

  const retryNotebookGeneration = React.useCallback(async () => {
    const userId = userIdRef.current;
    const sid = sessionIdRef.current;
    if (!userId || !sid || !llmKey) {
      return;
    }
    setIsRetryingSummary(true);
    setSummaryError(null);
    setClosureStep('reflecting');
    markReflectingStage('intro', null);
    try {
      const nowIso = new Date().toISOString();
      const notebook = await generateNotebookAndArc({
        userId,
        sessionIdValue: sid,
        messagesSnapshot: [...messages],
        nowIso,
      });
      setSessionNotebook(notebook);
    } catch (error) {
      console.error('Failed to retry session notebook', error);
      setSummaryError(
        "I wasn't able to capture a full reflection this time, but your conversation is saved.",
      );
    } finally {
      setIsRetryingSummary(false);
      setClosureStep('done');
      reflectingStageRef.current = { stage: 'intro', startedAt: 0 };
      setReflectingDetail(null);
    }
  }, [generateNotebookAndArc, llmKey, markReflectingStage, messages, userIdRef, sessionIdRef]);

  // Loading state
  if (!vaultReady || sessionState === 'loading') {
    return <ChatLoadingState />;
  }

  // Lumen unavailable state
  if (sessionState === 'unavailable') {
    return <LumenUnavailable onRetry={handleRetry} isRetrying={isRetrying} />;
  }

  // Error state (connection or other errors)
  if (sessionState === 'error') {
    return <ChatErrorState onRetry={handleRetry} isRetrying={isRetrying} />;
  }

  // Show session closure when complete
  if (sessionState === 'complete') {
    return (
      <SessionClosure
        sessionDate={sessionDateRef.current}
        partingWords={
          sessionNotebook ? extractClosureFields(sessionNotebook.markdown).partingWords : null
        }
        actionSteps={
          sessionNotebook ? extractClosureFields(sessionNotebook.markdown).actionSteps : []
        }
        closureStep={closureStep}
        reflectingDetail={reflectingDetail}
        summaryError={summaryError}
        isRetryingSummary={isRetryingSummary}
        onRetrySummary={retryNotebookGeneration}
      />
    );
  }

  const showProviderGate = sessionState === 'active' && storageReady && llmKeyReady && !llmKey;
  const sessionNumber = transcriptRef.current?.session_number ?? 1;

  return (
    <div className="atmosphere h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden overscroll-none">
      <ChatTopBar
        ref={headerRef}
        compactLandscapeLayout={compactLandscapeLayout}
        sessionNumber={sessionNumber}
        sessionDate={sessionDateRef.current}
        elapsedTime={elapsedTime}
        showWrapUp={!showProviderGate && !showEndSessionDialog}
        onWrapUp={handleEndSession}
      />

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
          streamInterruptedPartial={streamInterruptedPartial}
          onRetryInterruptedStream={() => {
            void retryLastResponse();
          }}
          onDismissInterruptedStream={clearStreamInterruption}
          scrollAreaRef={scrollAreaRef}
          spacerControlRef={spacerControlRef}
        />
      </main>

      {/* Input area */}
      <ChatFooter
        onSend={handleSend}
        onStop={abortConversation}
        isStreaming={isTyping || streamingContent !== null}
        disabled={!storageReady || !llmKeyReady || !llmKey}
        scrollAreaRef={scrollAreaRef}
        compact={compactLandscapeLayout}
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
