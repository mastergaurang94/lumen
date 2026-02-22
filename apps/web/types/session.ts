/**
 * Session-related type definitions.
 */

export type SessionState = 'loading' | 'active' | 'complete' | 'unavailable' | 'error';

// Progress steps during session closure (wrapping-up → storing → reflecting → done)
export type ClosureStep = 'wrapping-up' | 'storing' | 'reflecting' | 'done';

export interface SessionSpacing {
  state: 'ready';
  daysSinceLastSession: number | null;
  lastSessionDate: Date | null;
  hasActiveSession: boolean;
  isFirstSession: boolean;
}

export type MessageRole = 'lumen' | 'user';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}
