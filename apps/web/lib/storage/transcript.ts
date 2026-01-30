import { decodeJson, encodeJson } from '@/lib/crypto';
import type { Message } from '@/types/session';

// StoredMessage is JSON-friendly for encryption and chunk storage.
export interface StoredMessage {
  id: string;
  role: Message['role'];
  content: string;
  timestamp: string;
}

// Serialize messages to a compact JSON array for encryption.
export function serializeMessages(messages: Message[]): ArrayBuffer {
  const stored = messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp.toISOString(),
  }));
  return encodeJson(stored);
}

// Convert encrypted payloads back into runtime message objects.
export function deserializeMessages(buffer: ArrayBuffer): Message[] {
  const stored = decodeJson<StoredMessage[]>(buffer);
  return stored.map((message) => ({
    ...message,
    timestamp: new Date(message.timestamp),
  }));
}
