import * as React from 'react';

import {
  callLlmWithRetry,
  LlmAbortError,
  LlmInvalidKeyError,
  LlmUnavailableError,
} from '@/lib/llm/client';
import { DEFAULT_MODEL_ID } from '@/lib/llm/model-config';
import { buildSystemPrompt } from '@/lib/llm/prompts';
import { buildLlmMessages, generateMessageId } from '@/lib/session/messages';
import { streamText } from '@/lib/session/stream';
import type { Message, SessionState } from '@/types/session';
import type { SessionTranscript } from '@/types/storage';

const INITIAL_COACH_INSTRUCTION =
  'Begin the session with a brief warm welcome, include a one-line privacy reminder, and ask one open question.';

type UseLlmConversationParams = {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  sessionId: string | null;
  sessionState: SessionState;
  vaultReady: boolean;
  storageReady: boolean;
  llmKey: string | null;
  sessionContextRef: React.MutableRefObject<string | null>;
  transcriptRef: React.MutableRefObject<SessionTranscript | null>;
  queueMessageForChunk: (message: Message) => void;
  startActiveSegment: () => void;
  onMissingKey: () => void;
  onInvalidKey: (message: string) => void;
  onUnavailable: () => void;
  onError: () => void;
};

type UseLlmConversationResult = {
  isTyping: boolean;
  streamingContent: string | null;
  handleSend: (content: string) => Promise<void>;
  abortConversation: () => void;
  setStreamingContent: React.Dispatch<React.SetStateAction<string | null>>;
};

/**
 * Manages LLM calls, streaming, and message state for a session.
 *
 * Note: Streaming is simulated — the full response is fetched first, then
 * displayed incrementally via streamText(). This simplifies error handling
 * and retry logic while maintaining a natural typing feel.
 */
export function useLlmConversation({
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
  onMissingKey,
  onInvalidKey,
  onUnavailable,
  onError,
}: UseLlmConversationParams): UseLlmConversationResult {
  const [isTyping, setIsTyping] = React.useState(false);
  const [streamingContent, setStreamingContent] = React.useState<string | null>(null);
  // Ref (not state) because we need synchronous reads in the effect guard
  // and don't want re-renders when toggling it.
  const initialPromptSentRef = React.useRef(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    if (!sessionId) return;
    initialPromptSentRef.current = false;
  }, [sessionId]);

  // Clean up any in-flight request when the component unmounts.
  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const abortConversation = React.useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // Send the initial coach greeting when starting a fresh session.
  React.useEffect(() => {
    if (sessionState !== 'active' || !vaultReady || !storageReady) return;
    if (!llmKey) return;
    if (messages.length > 0) return;
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

        for await (const partial of streamText(
          responseText,
          abortControllerRef.current?.signal,
        )) {
          setStreamingContent(partial);
        }

        const coachMessage: Message = {
          id: generateMessageId(),
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
          onInvalidKey(error.message);
          return;
        }
        if (error instanceof LlmUnavailableError) {
          onUnavailable();
        } else {
          onError();
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
    onError,
    onInvalidKey,
    onUnavailable,
    queueMessageForChunk,
    sessionContextRef,
    sessionState,
    startActiveSegment,
    storageReady,
    transcriptRef,
    vaultReady,
  ]);

  const handleSend = React.useCallback(
    async (content: string) => {
      // Add user message
      const userMessage: Message = {
        id: generateMessageId(),
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
        onMissingKey();
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
          onInvalidKey(error.message);
          return;
        }
        if (error instanceof LlmUnavailableError) {
          onUnavailable();
        } else {
          onError();
        }
        return;
      }

      // Hide typing indicator, start streaming
      setIsTyping(false);
      setStreamingContent('');

      try {
        for await (const partial of streamText(
          responseText,
          abortControllerRef.current.signal,
        )) {
          setStreamingContent(partial);
        }

        // Finalize the message
        const coachMessage: Message = {
          id: generateMessageId(),
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
    [
      llmKey,
      messages,
      onError,
      onInvalidKey,
      onMissingKey,
      onUnavailable,
      queueMessageForChunk,
      sessionContextRef,
      startActiveSegment,
      transcriptRef,
    ],
  );

  return {
    isTyping,
    streamingContent,
    handleSend,
    abortConversation,
    setStreamingContent,
  };
}
