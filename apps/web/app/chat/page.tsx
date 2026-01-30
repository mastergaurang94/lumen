'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { decrypt, encrypt, generateIV, hashTranscript } from '@/lib/crypto';
import { getKey, isUnlocked } from '@/lib/crypto/key-context';
import { createStorageService } from '@/lib/storage/dexie-storage';
import { getOrCreateUserId } from '@/lib/storage/user';
import { deserializeMessages, serializeMessages } from '@/lib/storage/transcript';
import type {
  VaultMetadata,
  SessionTranscript,
  SessionTranscriptChunk,
  SessionSummary,
} from '@/types/storage';
import type { SessionState, Message } from '@/types/session';

// Mock toggles - use env vars in production
const MOCK_COACH_UNAVAILABLE = process.env.NEXT_PUBLIC_MOCK_COACH_UNAVAILABLE === 'true';
const MOCK_CONNECTION_ERROR = process.env.NEXT_PUBLIC_MOCK_CONNECTION_ERROR === 'true';

// Mock closure data - in real app this would be generated from the session
const MOCK_RECOGNITION_MOMENT =
  'What would it look like to trust yourself the way you trust your instincts at work?';
const MOCK_ACTION_STEPS = [
  "Notice when you're second-guessing a decision this week — pause and ask what your gut says first",
  'Have one conversation where you share your real opinion, even if it feels uncomfortable',
  'Write down one thing you did well each day, without qualifying it',
];

function buildMockSummary(): string {
  // Temporary summary format until LLM summarization is added.
  return [
    'You named the tension between trust and second-guessing.',
    'We traced the pattern to moments where outside feedback outweighs your own signal.',
    'You want to act from conviction rather than permission.',
    'Recognition: the pull to edit yourself before you even speak.',
    'Next session: check in on how often you let your first instinct lead.',
  ].join('\n');
}

// Mock initial message from coach
const INITIAL_COACH_MESSAGE = `Welcome. I'm glad you're here.

Before we begin, I want you to know that everything we discuss stays between us — your conversations are stored locally on your device and are never used to train AI models.

So, **what's on your mind today?** What brought you here, and what's the thing you've been circling that matters most right now?`;

// Simulated coach responses for demo
const MOCK_RESPONSES = [
  `That's a meaningful place to start. Thank you for sharing that with me.

I hear that you're feeling pulled in different directions. There's something underneath that tension worth exploring.

What does your gut tell you about what's most important right now — not what *should* be important, but what actually feels urgent or alive?`,

  `I notice you're being quite thoughtful about this, which tells me it matters.

Sometimes when we're stuck, it's because we're trying to solve the wrong problem. The surface issue might not be the real one.

**What would change if you stopped trying to figure this out perfectly?** What might you try instead?`,

  `That resonates. And I appreciate your honesty in naming it.

It sounds like there's a pattern here — one that might be familiar. Have you noticed this dynamic before in other areas of your life?

Sometimes recognizing a pattern is the first step to choosing differently.`,
];

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Simulate streaming text with abort support
async function* streamText(text: string, signal?: AbortSignal): AsyncGenerator<string> {
  const words = text.split(' ');
  for (let i = 0; i < words.length; i++) {
    if (signal?.aborted) return;
    yield words.slice(0, i + 1).join(' ');
    await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 40));
  }
}

// Inner chat component (wrapped by error boundary)
function ChatPageInner() {
  const router = useRouter();
  const storageRef = React.useRef(createStorageService());
  const vaultMetadataRef = React.useRef<VaultMetadata | null>(null);
  const userIdRef = React.useRef<string | null>(null);
  const sessionIdRef = React.useRef<string | null>(null);
  const transcriptRef = React.useRef<SessionTranscript | null>(null);
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
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const responseIndexRef = React.useRef(0);
  const sessionDateRef = React.useRef(new Date());
  const abortControllerRef = React.useRef<AbortController | null>(null);

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
      const metadata = await storageRef.current.getVaultMetadata();
      if (!metadata?.vault_initialized) {
        router.replace('/setup');
        return;
      }
      if (!isUnlocked()) {
        router.replace('/unlock');
        return;
      }
      vaultMetadataRef.current = metadata;
      userIdRef.current = getOrCreateUserId();
      setVaultReady(true);
    };

    checkVault();
  }, [router]);

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

  // Update elapsed time every minute
  React.useEffect(() => {
    if (sessionState !== 'active') return;

    const updateElapsed = () => {
      setElapsedTime(formatElapsedTime(sessionDateRef.current));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [sessionState]);

  React.useEffect(() => {
    if (sessionState !== 'active' || !vaultReady) return;

    const initStorageSession = async () => {
      const userId = userIdRef.current;
      if (!userId) return;

      const transcripts = await storageRef.current.listTranscripts(userId);
      const activeTranscript = transcripts.find((transcript) => transcript.ended_at === null) ?? null;

      if (activeTranscript) {
        // Resume the active transcript by replaying chunked payloads.
        isResumingRef.current = true;
        sessionIdRef.current = activeTranscript.session_id;
        transcriptRef.current = activeTranscript;
        sessionDateRef.current = new Date(activeTranscript.started_at);

        const key = getKey();
        if (!key) return;

        const chunks = await storageRef.current.listTranscriptChunks(activeTranscript.session_id);
        chunkIndexRef.current = chunks.length;

        const restoredMessages: Message[] = [];
        for (const chunk of chunks) {
          const decrypted = await decrypt(
            chunk.encrypted_blob,
            key,
            chunk.encryption_header.iv,
          );
          restoredMessages.push(...deserializeMessages(decrypted));
        }

        if (restoredMessages.length > 0) {
          setMessages(restoredMessages);
        }
        setStorageReady(true);
        return;
      }

      // Start a new transcript and mark it active.
      const now = new Date();
      const sessionId = crypto.randomUUID();
      const transcript: SessionTranscript = {
        session_id: sessionId,
        user_id: userId,
        started_at: now.toISOString(),
        ended_at: null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
        locale_hint: navigator.language ?? null,
        system_prompt_version: 'intake-v0.1',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      sessionIdRef.current = sessionId;
      transcriptRef.current = transcript;
      chunkIndexRef.current = 0;
      await storageRef.current.saveTranscript(transcript);
      setStorageReady(true);
    };

    initStorageSession();
  }, [sessionState, vaultReady]);

  React.useEffect(() => {
    if (sessionState !== 'active' || !vaultReady || !storageReady) return;
    if (isResumingRef.current || messages.length > 0) return;

    const timer = window.setTimeout(() => {
      // Seed the session with the initial coach message.
      const initialMessage: Message = {
        id: generateId(),
        role: 'coach',
        content: INITIAL_COACH_MESSAGE,
        timestamp: new Date(),
      };
      setMessages([initialMessage]);
      queueMessageForChunk(initialMessage);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [messages.length, queueMessageForChunk, sessionState, storageReady, vaultReady]);

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

  // Handle sending a message
  const handleSend = React.useCallback(async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    queueMessageForChunk(userMessage);

    // Show typing indicator
    setIsTyping(true);

    // Simulate thinking delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Hide typing indicator, start streaming
    setIsTyping(false);

    // Get next mock response (cycle through them)
    const responseText = MOCK_RESPONSES[responseIndexRef.current % MOCK_RESPONSES.length];
    responseIndexRef.current++;

    // Create abort controller for this stream
    abortControllerRef.current = new AbortController();

    // Stream the response
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
      queueMessageForChunk(coachMessage);
    } finally {
      setStreamingContent(null);
      abortControllerRef.current = null;
    }
  }, [queueMessageForChunk]);

  // Handle end session
  const handleEndSession = React.useCallback(() => {
    setShowEndSessionDialog(true);
  }, []);

  const confirmEndSession = React.useCallback(async () => {
    // Abort any ongoing streaming
    abortControllerRef.current?.abort();
    setShowEndSessionDialog(false);

    await flushPendingMessages();

    const transcript = transcriptRef.current;
    if (transcript) {
      const now = new Date().toISOString();
      const updatedTranscript = { ...transcript, ended_at: now, updated_at: now };
      transcriptRef.current = updatedTranscript;
      await storageRef.current.saveTranscript(updatedTranscript);
    }

    const userId = userIdRef.current;
    const sessionId = sessionIdRef.current;
    // Persist a mock summary and touch profile metadata on session close.
    if (userId && sessionId) {
      const now = new Date().toISOString();
      const summary: SessionSummary = {
        session_id: sessionId,
        user_id: userId,
        summary_text: buildMockSummary(),
        recognition_moment: MOCK_RECOGNITION_MOMENT,
        action_steps: MOCK_ACTION_STEPS,
        open_threads: [],
        coach_notes: null,
        created_at: now,
        updated_at: now,
      };
      await storageRef.current.saveSummary(summary);

      const profile = await storageRef.current.getProfile(userId);
      if (profile) {
        await storageRef.current.saveProfile({ ...profile, updated_at: now });
      }
    }

    setSessionState('complete');
  }, [flushPendingMessages]);

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
    // Calculate next session date (7 days from now)
    const nextSessionDate = new Date();
    nextSessionDate.setDate(nextSessionDate.getDate() + 7);

    return (
      <SessionClosure
        sessionDate={sessionDateRef.current}
        recognitionMoment={MOCK_RECOGNITION_MOMENT}
        actionSteps={MOCK_ACTION_STEPS}
        nextSessionDate={nextSessionDate}
      />
    );
  }

  return (
    <div className="atmosphere h-screen flex flex-col overflow-hidden">
      {/* Hamburger menu - top left */}
      <div className="fixed top-4 left-4" style={{ zIndex: Z_INDEX.navigation }}>
        <Sidebar />
      </div>

      {/* End Session button - top right */}
      <div className="fixed top-4 right-4" style={{ zIndex: Z_INDEX.navigation }}>
        <Button variant="outline" onClick={handleEndSession} className="text-base text-foreground">
          End Session
        </Button>
      </div>

      {/* Title - centered */}
      <div className="pt-16 pb-4 text-center">
        <h1 className="font-display text-lg text-foreground">
          Session · {formatSessionDate(sessionDateRef.current)}
        </h1>
        {elapsedTime && <p className="text-xs text-muted-foreground/60 mt-1">{elapsedTime}</p>}
      </div>

      {/* Messages area */}
      <main className="flex-1 min-h-0 overflow-hidden">
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
              disabled={!storageReady || isTyping || streamingContent !== null}
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
