import { NextResponse } from 'next/server';
import {
  DEFAULT_PROVIDER_ERROR_MESSAGE,
  formatProviderErrorMessage,
  parseAnthropicErrorDetails,
} from '@/lib/llm/anthropic-errors';

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
};

const IS_DEV = process.env.NODE_ENV !== 'production';

// Format check only - actual token validation happens when Anthropic's API responds.
// Malformed or expired tokens will still pass this check but fail at the API call.
function isClaudeCodeOAuthToken(token: string) {
  return token.startsWith('sk-ant-oat');
}

function buildClaudeCodeSystemPrompt(systemPrompt: string) {
  const claudeCodeIdentity =
    "You are Claude Code, Anthropic's official CLI for Claude.";
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
  try {
    const payload = (await request.json()) as ProxyPayload;
    if (!payload?.apiKey) {
      return NextResponse.json({ error: { message: 'Missing OAuth token.' } }, { status: 400 });
    }
    if (!isClaudeCodeOAuthToken(payload.apiKey)) {
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
    };

    // TODO: Consider passing request.signal to abort upstream on client disconnect.
    // Currently, if the client navigates away, this request continues to completion
    // and the response is discarded. For MVP this is acceptable; a future improvement
    // could queue pending responses for session resume.
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: buildAnthropicHeaders(payload.apiKey),
      body: JSON.stringify(upstreamBody),
    });

    if (!response.ok) {
      const message = await parseAnthropicErrorDetails(response);
      const errorMessage = formatProviderErrorMessage(
        DEFAULT_PROVIDER_ERROR_MESSAGE,
        message,
        IS_DEV,
      );
      return NextResponse.json(
        { error: { message: errorMessage } },
        { status: response.status },
      );
    }

    const responseText = await response.text();
    return new Response(responseText, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch {
    return NextResponse.json(
      { error: { message: 'Failed to reach the LLM provider.' } },
      { status: 500 },
    );
  }
}
