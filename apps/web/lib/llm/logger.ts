/**
 * Structured logger for LLM observability.
 *
 * Outputs JSON logs for easy parsing in development and production monitoring.
 * All logs include timestamp and a consistent shape for filtering/aggregation.
 */

export type LogLevel = 'info' | 'warn' | 'error';

export type LlmLogEvent =
  | 'llm_request_start'
  | 'llm_request_success'
  | 'llm_request_error'
  | 'llm_request_retry'
  | 'llm_request_abort';

export type LlmLogContext = {
  event: LlmLogEvent;
  model?: string;
  // Timing
  durationMs?: number;
  // Token usage (from Anthropic response)
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  // Error context
  errorType?: string;
  errorMessage?: string;
  statusCode?: number;
  retryAttempt?: number;
  maxRetries?: number;
  retryable?: boolean;
  // Request metadata
  messageCount?: number;
  systemPromptLength?: number;
};

type StructuredLog = {
  timestamp: string;
  level: LogLevel;
  source: 'lumen-llm';
} & LlmLogContext;

function formatLog(level: LogLevel, context: LlmLogContext): string {
  const log: StructuredLog = {
    timestamp: new Date().toISOString(),
    level,
    source: 'lumen-llm',
    ...context,
  };
  return JSON.stringify(log);
}

export const llmLogger = {
  info(context: LlmLogContext): void {
    console.info(formatLog('info', context));
  },

  warn(context: LlmLogContext): void {
    console.warn(formatLog('warn', context));
  },

  error(context: LlmLogContext): void {
    console.error(formatLog('error', context));
  },
};

/**
 * Helper to measure duration of an async operation.
 * Returns [result, durationMs] tuple.
 */
export async function withTiming<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const start = performance.now();
  const result = await fn();
  const durationMs = Math.round(performance.now() - start);
  return [result, durationMs];
}
