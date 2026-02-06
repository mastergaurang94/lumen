import { formatProviderErrorMessage, parseAnthropicErrorDetails } from '@/lib/llm/anthropic-errors';
import { llmLogger } from '@/lib/llm/logger';
import { resolveProviderModelId } from '@/lib/llm/model-config';

export type LlmMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type LlmCallParams = {
  apiKey: string;
  modelId: string;
  systemPrompt: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

// Error classes enable UI to distinguish between recoverable and fatal failures:
// - LlmUnavailableError: transient provider outage, show "Lumen unavailable" UI
// - LlmInvalidKeyError: bad credentials, prompt user to re-enter key
// - LlmResponseError: internal, classified as retryable or not

export class LlmUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmUnavailableError';
  }
}

export class LlmInvalidKeyError extends Error {
  status: number | null;
  constructor(message: string) {
    super(message);
    this.name = 'LlmInvalidKeyError';
    this.status = null;
  }
}

export class LlmAbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmAbortError';
  }
}

class LlmResponseError extends Error {
  status: number | null;
  retryable: boolean;
  details?: string;

  constructor(message: string, status: number | null, retryable: boolean, details?: string) {
    super(message);
    this.name = 'LlmResponseError';
    this.status = status;
    this.retryable = retryable;
    this.details = details;
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TOKENS = 1200;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 900;
const MAX_RETRY_DELAY_MS = 5000;
const ANTHROPIC_PROXY_PATH = '/api/llm/anthropic';
const IS_DEV = process.env.NODE_ENV !== 'production';

// Avoid leaking a key into logs; keep error messages generic unless safe.
function formatErrorMessage(status: number | null): string {
  if (status === null) return 'Network error while contacting the provider.';
  if (status === 401 || status === 403) return 'Invalid auth token.';
  return 'The provider returned an error.';
}

function isRetryableStatus(status: number | null): boolean {
  if (status === null) return true;
  return [408, 429, 500, 502, 503, 504].includes(status);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Simple exponential backoff with jitter to spread retry load.
function computeRetryDelay(attempt: number) {
  const base = BASE_RETRY_DELAY_MS * 2 ** Math.max(0, attempt);
  const jitter = Math.random() * 250;
  return Math.min(MAX_RETRY_DELAY_MS, base + jitter);
}

// Wrap fetch with a timeout while respecting any caller-provided AbortSignal.
async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit & { timeoutMs?: number } = {},
) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const signal = rest.signal
    ? mergeAbortSignals(rest.signal, controller.signal)
    : controller.signal;

  try {
    return await fetch(input, { ...rest, signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

// Merge two signals so either caller or timeout can abort the request.
function mergeAbortSignals(external: AbortSignal, internal: AbortSignal): AbortSignal {
  if (external.aborted) return external;
  const controller = new AbortController();
  const abort = () => controller.abort();
  external.addEventListener('abort', abort, { once: true });
  internal.addEventListener('abort', abort, { once: true });
  return controller.signal;
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return (error as { name?: string }).name === 'AbortError';
}

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

type CallAnthropicResult = {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
};

// Calls Anthropic Messages API and returns the assistant text plus token usage.
async function callAnthropic(params: LlmCallParams): Promise<CallAnthropicResult> {
  if (params.signal?.aborted) {
    llmLogger.info({ event: 'llm_request_abort', model: params.modelId });
    throw new LlmAbortError('LLM request aborted.');
  }

  const resolvedModelId = resolveProviderModelId(params.modelId);
  const payload = {
    model: resolvedModelId,
    max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: params.temperature ?? DEFAULT_TEMPERATURE,
    system: params.systemPrompt,
    messages: params.messages,
  };

  llmLogger.info({
    event: 'llm_request_start',
    model: resolvedModelId,
    messageCount: params.messages.length,
    systemPromptLength: params.systemPrompt.length,
  });

  const startTime = performance.now();
  let response: Response;

  try {
    response = await fetchWithTimeout(ANTHROPIC_PROXY_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        apiKey: params.apiKey,
        ...payload,
      }),
      signal: params.signal,
    });
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);
    if (params.signal?.aborted || isAbortError(error)) {
      llmLogger.info({ event: 'llm_request_abort', model: resolvedModelId, durationMs });
      throw new LlmAbortError('LLM request aborted.');
    }
    llmLogger.error({
      event: 'llm_request_error',
      model: resolvedModelId,
      durationMs,
      errorType: 'NetworkError',
      errorMessage: 'Network error while contacting the provider.',
      retryable: true,
    });
    throw new LlmResponseError(formatErrorMessage(null), null, true);
  }

  const durationMs = Math.round(performance.now() - startTime);

  if (!response.ok) {
    const details = await parseAnthropicErrorDetails(response);
    const retryable = isRetryableStatus(response.status);

    if (response.status === 401 || response.status === 403) {
      llmLogger.error({
        event: 'llm_request_error',
        model: resolvedModelId,
        durationMs,
        errorType: 'LlmInvalidKeyError',
        errorMessage: 'Invalid auth token.',
        statusCode: response.status,
        retryable: false,
      });
      const error = new LlmInvalidKeyError(formatErrorMessage(response.status));
      error.status = response.status;
      error.message = formatProviderErrorMessage(error.message, details, IS_DEV);
      throw error;
    }

    llmLogger.error({
      event: 'llm_request_error',
      model: resolvedModelId,
      durationMs,
      errorType: 'LlmResponseError',
      errorMessage: details ?? 'The provider returned an error.',
      statusCode: response.status,
      retryable,
    });

    const baseMessage = formatErrorMessage(response.status);
    const message = formatProviderErrorMessage(baseMessage, details, IS_DEV);
    throw new LlmResponseError(message, response.status, retryable, details ?? undefined);
  }

  const data = (await response.json()) as AnthropicResponse;
  const text = data.content?.map((part) => part.text ?? '').join('') ?? '';
  const inputTokens = data.usage?.input_tokens;
  const outputTokens = data.usage?.output_tokens;

  llmLogger.info({
    event: 'llm_request_success',
    model: resolvedModelId,
    durationMs,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens && outputTokens ? inputTokens + outputTokens : undefined,
  });

  return { text: text.trim(), inputTokens, outputTokens };
}

/**
 * Calls the LLM with bounded retries. Throws LlmUnavailableError when the provider
 * is unreachable after retries.
 */
export async function callLlmWithRetry(params: LlmCallParams, retries = DEFAULT_RETRIES) {
  const resolvedModelId = resolveProviderModelId(params.modelId);
  let attempt = 0;

  while (attempt <= retries) {
    if (params.signal?.aborted) {
      throw new LlmAbortError('LLM request aborted.');
    }
    try {
      const result = await callAnthropic(params);
      return result.text;
    } catch (error) {
      if (error instanceof LlmAbortError) {
        throw error;
      }
      if (error instanceof LlmInvalidKeyError) {
        throw error;
      }
      const isRetryable =
        error instanceof LlmResponseError ? error.retryable : isRetryableStatus(null);

      if (!isRetryable || attempt === retries) {
        if (isRetryable) {
          llmLogger.error({
            event: 'llm_request_error',
            model: resolvedModelId,
            errorType: 'LlmUnavailableError',
            errorMessage: 'LLM provider is unavailable after retries.',
            retryAttempt: attempt,
            maxRetries: retries,
          });
          throw new LlmUnavailableError('LLM provider is unavailable.');
        }
        throw error;
      }

      if (params.signal?.aborted) {
        throw new LlmAbortError('LLM request aborted.');
      }

      llmLogger.warn({
        event: 'llm_request_retry',
        model: resolvedModelId,
        retryAttempt: attempt + 1,
        maxRetries: retries,
        errorType: error instanceof LlmResponseError ? 'LlmResponseError' : 'Unknown',
        statusCode: error instanceof LlmResponseError ? (error.status ?? undefined) : undefined,
      });

      await sleep(computeRetryDelay(attempt));
      attempt += 1;
    }
  }

  throw new LlmUnavailableError('LLM provider is unavailable.');
}
