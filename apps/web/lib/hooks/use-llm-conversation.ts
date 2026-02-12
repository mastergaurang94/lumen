import * as React from 'react';

import {
  LlmAbortError,
  LlmInvalidKeyError,
  LlmUnavailableError,
  streamLlmWithRetry,
} from '@/lib/llm/client';
import { DEFAULT_MODEL_ID } from '@/lib/llm/model-config';
import { buildSystemPrompt } from '@/lib/llm/prompts';
import { buildLlmMessages, generateMessageId } from '@/lib/session/messages';
import type { Message, SessionState } from '@/types/session';
import type { SessionTranscript } from '@/types/storage';

const INITIAL_LUMEN_INSTRUCTION =
  'Begin the conversation with a warm, simple greeting. Be glad to be here.';

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
  streamInterruptedPartial: string | null;
  clearStreamInterruption: () => void;
  retryLastResponse: () => Promise<void>;
  handleSend: (content: string) => Promise<void>;
  abortConversation: () => void;
};

export type StreamCollectionOutcome =
  | { kind: 'completed'; finalText: string | null; hadStreamed: boolean }
  | { kind: 'aborted'; hadStreamed: boolean }
  | { kind: 'errored'; partialText: string | null; error: unknown; hadStreamed: boolean };

// Collects a streamed response into final/partial text while preserving interruption detail.
export async function collectStreamingOutcome(
  stream: AsyncIterable<string>,
  options?: {
    onPartial?: (partial: string) => void;
    onFirstPartial?: () => void;
  },
): Promise<StreamCollectionOutcome> {
  let responseText = '';
  let hasStreamed = false;
  try {
    for await (const partial of stream) {
      if (!hasStreamed) {
        options?.onFirstPartial?.();
        hasStreamed = true;
      }
      responseText = partial;
      options?.onPartial?.(partial);
    }
    const finalText = responseText.trim();
    return {
      kind: 'completed',
      finalText: finalText.length > 0 ? finalText : null,
      hadStreamed: hasStreamed,
    };
  } catch (error) {
    if (error instanceof LlmAbortError) {
      return { kind: 'aborted', hadStreamed: hasStreamed };
    }
    const partialText = responseText.trim();
    return {
      kind: 'errored',
      partialText: partialText.length > 0 ? partialText : null,
      error,
      hadStreamed: hasStreamed,
    };
  }
}

/**
 * Manages LLM calls, streaming, and message state for a session.
 *
 * Streams live LLM responses and updates message state.
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
  const [streamInterruptedPartial, setStreamInterruptedPartial] = React.useState<string | null>(
    null,
  );
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

  const streamAssistantReply = React.useCallback(
    async (modelMessages: Array<{ role: 'user' | 'assistant'; content: string }>) => {
      if (!llmKey) {
        onMissingKey();
        return;
      }

      const sessionNumber = transcriptRef.current?.session_number ?? 1;
      const systemPrompt = buildSystemPrompt({
        sessionNumber,
        sessionContext: sessionContextRef.current ?? '',
      });

      abortControllerRef.current = new AbortController();

      setIsTyping(true);
      setStreamingContent('');
      setStreamInterruptedPartial(null);
      try {
        const outcome = await collectStreamingOutcome(
          streamLlmWithRetry(
            {
              apiKey: llmKey,
              modelId: DEFAULT_MODEL_ID,
              systemPrompt,
              messages: modelMessages,
              signal: abortControllerRef.current.signal,
            },
            2,
          ),
          {
            onFirstPartial: () => setIsTyping(false),
            onPartial: (partial) => setStreamingContent(partial),
          },
        );

        if (!outcome.hadStreamed) {
          setIsTyping(false);
        }
        if (outcome.kind === 'aborted') {
          return;
        }
        if (outcome.kind === 'errored') {
          if (outcome.error instanceof LlmInvalidKeyError) {
            onInvalidKey(outcome.error.message);
            return;
          }
          setStreamInterruptedPartial(outcome.partialText);
          if (outcome.error instanceof LlmUnavailableError) {
            console.warn('Lumen response interrupted (unavailable)', outcome.error);
          } else {
            console.warn('Lumen response interrupted', outcome.error);
          }
          return;
        }
        if (!outcome.finalText) {
          return;
        }

        const lumenMessage: Message = {
          id: generateMessageId(),
          role: 'lumen',
          content: outcome.finalText,
          timestamp: new Date(),
        };
        setStreamingContent(null);
        setMessages((prev) => [...prev, lumenMessage]);
        startActiveSegment();
        queueMessageForChunk(lumenMessage);
      } finally {
        setIsTyping(false);
        setStreamingContent(null);
        abortControllerRef.current = null;
      }
    },
    [
      llmKey,
      onInvalidKey,
      onMissingKey,
      queueMessageForChunk,
      sessionContextRef,
      setMessages,
      startActiveSegment,
      transcriptRef,
    ],
  );

  // Send the initial Lumen greeting when starting a fresh session.
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
        let responseText = '';
        let hasStreamed = false;
        for await (const partial of streamLlmWithRetry({
          apiKey: llmKey,
          modelId: DEFAULT_MODEL_ID,
          systemPrompt,
          messages: [{ role: 'user', content: INITIAL_LUMEN_INSTRUCTION }],
          signal: abortControllerRef.current?.signal,
        })) {
          if (!hasStreamed) {
            setIsTyping(false);
            hasStreamed = true;
          }
          responseText = partial;
          setStreamingContent(partial);
        }

        if (!hasStreamed) {
          setIsTyping(false);
        }

        const finalText = responseText.trim();
        if (!finalText) {
          return;
        }

        const lumenMessage: Message = {
          id: generateMessageId(),
          role: 'lumen',
          content: finalText,
          timestamp: new Date(),
        };
        // Clear the streaming placeholder before committing the final message.
        // This prevents a one-frame duplicate where both versions render together.
        setStreamingContent(null);
        setMessages([lumenMessage]);
        startActiveSegment();
        queueMessageForChunk(lumenMessage);
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
      setStreamInterruptedPartial(null);
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
      const modelMessages = buildLlmMessages(nextMessages);
      await streamAssistantReply(modelMessages);
    },
    [llmKey, messages, onMissingKey, streamAssistantReply],
  );

  const retryLastResponse = React.useCallback(async () => {
    if (!llmKey) {
      onMissingKey();
      return;
    }
    setStreamInterruptedPartial(null);
    const modelMessages = buildLlmMessages(messages);
    await streamAssistantReply(modelMessages);
  }, [llmKey, messages, onMissingKey, streamAssistantReply]);

  return {
    isTyping,
    streamingContent,
    streamInterruptedPartial,
    clearStreamInterruption: () => setStreamInterruptedPartial(null),
    retryLastResponse,
    handleSend,
    abortConversation,
  };
}
