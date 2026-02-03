import type { LlmMessage } from '@/lib/llm/client';
import type { Message } from '@/types/session';

// Generate deterministic-ish message IDs for UI and storage.
export function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Map UI chat roles to provider-friendly message roles.
export function buildLlmMessages(messages: Message[]): LlmMessage[] {
  return messages.map((message) => ({
    role: message.role === 'coach' ? 'assistant' : 'user',
    content: message.content,
  }));
}
