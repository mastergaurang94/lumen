import { NextResponse } from 'next/server';
import {
  DEFAULT_PROVIDER_ERROR_MESSAGE,
  formatProviderErrorMessage,
  parseAnthropicErrorDetails,
} from '@/lib/llm/anthropic-errors';
import { llmLogger } from '@/lib/llm/logger';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Claude Code OAuth tokens require specific headers and beta flags.
// Keep version in sync with Claude Code releases if compatibility issues arise.
const CLAUDE_CODE_VERSION = '2.1.2';
const CLAUDE_CODE_USER_AGENT = `claude-cli/${CLAUDE_CODE_VERSION} (external, cli)`;
const CLAUDE_CODE_BETA_FLAGS =
  'claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14';

type ProxyPayload = {
  apiKey: string;
  model: string;
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
};

const IS_DEV = process.env.NODE_ENV !== 'production';

// Format check only - actual token validation happens when Anthropic's API responds.
// Malformed or expired tokens will still pass this check but fail at the API call.
function isClaudeCodeOAuthToken(token: string) {
  return token.startsWith('sk-ant-oat');
}

function buildClaudeCodeSystemPrompt(systemPrompt: string) {
  const claudeCodeIdentity = "You are Claude Code, Anthropic's official CLI for Claude.";
  if (!systemPrompt.trim()) {
    return [claudeCodeIdentity];
  }
  return [claudeCodeIdentity, systemPrompt];
}

function buildAnthropicHeaders(apiKey: string): Headers {
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  headers.set('anthropic-version', ANTHROPIC_VERSION);
  headers.set('authorization', `Bearer ${apiKey}`);
  headers.set('accept', 'application/json');
  headers.set('anthropic-dangerous-direct-browser-access', 'true');
  headers.set('anthropic-beta', CLAUDE_CODE_BETA_FLAGS);
  headers.set('user-agent', CLAUDE_CODE_USER_AGENT);
  headers.set('x-app', 'cli');
  return headers;
}

export async function POST(request: Request) {
  const startTime = performance.now();

  try {
    const payload = (await request.json()) as ProxyPayload;
    if (!payload?.apiKey) {
      llmLogger.warn({
        event: 'llm_request_error',
        errorType: 'ValidationError',
        errorMessage: 'Missing OAuth token.',
        statusCode: 400,
      });
      return NextResponse.json({ error: { message: 'Missing OAuth token.' } }, { status: 400 });
    }
    if (!isClaudeCodeOAuthToken(payload.apiKey)) {
      llmLogger.warn({
        event: 'llm_request_error',
        errorType: 'ValidationError',
        errorMessage: 'Only Claude Code OAuth tokens are supported.',
        statusCode: 400,
      });
      return NextResponse.json(
        { error: { message: 'Only Claude Code OAuth tokens are supported.' } },
        { status: 400 },
      );
    }

    const system = buildClaudeCodeSystemPrompt(payload.system).map((text) => ({
      type: 'text' as const,
      text,
    }));
    const upstreamBody = {
      model: payload.model,
      max_tokens: payload.max_tokens ?? 1200,
      temperature: payload.temperature ?? 0.7,
      system,
      messages: payload.messages.map((message) => ({
        role: message.role,
        content: [{ type: 'text', text: message.content }],
      })),
      stream: payload.stream ?? false,
    };

    llmLogger.info({
      event: 'llm_request_start',
      model: payload.model,
      messageCount: payload.messages.length,
    });

    const headers = buildAnthropicHeaders(payload.apiKey);
    if (payload.stream) {
      headers.set('accept', 'text/event-stream');
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(upstreamBody),
      signal: request.signal,
    });

    const durationMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const message = await parseAnthropicErrorDetails(response);
      const errorMessage = formatProviderErrorMessage(
        DEFAULT_PROVIDER_ERROR_MESSAGE,
        message,
        IS_DEV,
      );
      llmLogger.error({
        event: 'llm_request_error',
        model: payload.model,
        durationMs,
        errorType: 'UpstreamError',
        errorMessage: message ?? 'Unknown upstream error',
        statusCode: response.status,
      });
      return NextResponse.json({ error: { message: errorMessage } }, { status: response.status });
    }

    if (payload.stream) {
      if (!response.body) {
        llmLogger.error({
          event: 'llm_request_error',
          model: payload.model,
          durationMs,
          errorType: 'StreamError',
          errorMessage: 'Missing response stream.',
          statusCode: 502,
        });
        return NextResponse.json(
          { error: { message: 'Missing response stream.' } },
          { status: 502 },
        );
      }
      return new Response(response.body, {
        status: response.status,
        headers: {
          'content-type': response.headers.get('content-type') ?? 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        },
      });
    }

    const responseText = await response.text();

    // Parse response to extract token usage for logging
    try {
      const responseData = JSON.parse(responseText) as {
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const inputTokens = responseData.usage?.input_tokens;
      const outputTokens = responseData.usage?.output_tokens;

      llmLogger.info({
        event: 'llm_request_success',
        model: payload.model,
        durationMs,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens && outputTokens ? inputTokens + outputTokens : undefined,
      });
    } catch {
      // Log success without token details if parsing fails
      llmLogger.info({
        event: 'llm_request_success',
        model: payload.model,
        durationMs,
      });
    }

    return new Response(responseText, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch {
    const durationMs = Math.round(performance.now() - startTime);
    llmLogger.error({
      event: 'llm_request_error',
      durationMs,
      errorType: 'NetworkError',
      errorMessage: 'Failed to reach the LLM provider.',
      statusCode: 500,
    });
    return NextResponse.json(
      { error: { message: 'Failed to reach the LLM provider.' } },
      { status: 500 },
    );
  }
}
