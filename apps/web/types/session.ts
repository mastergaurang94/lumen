/**
 * Session-related type definitions.
 */

export type SessionState = 'loading' | 'active' | 'complete' | 'unavailable' | 'error';

// Session spacing states: 'early_return' when < 7 days, 'ready' otherwise
export type SessionSpacingState = 'early_return' | 'ready';

export interface SessionSpacing {
  state: SessionSpacingState;
  daysSinceLastSession: number | null;
  lastSessionDate: Date | null;
  hasActiveSession: boolean;
  isFirstSession: boolean;
}

// Deprecated: use SessionSpacing instead
export type SessionGateState = 'locked' | 'unlocked';

// Deprecated: use SessionSpacing instead
export interface SessionGate {
  state: SessionGateState;
  nextAvailable: Date | null;
  lastSessionDate: Date | null;
  hasActiveSession: boolean;
}

export type MessageRole = 'lumen' | 'user';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface SessionClosureData {
  sessionDate: Date;
  recognitionMoment: string;
  actionSteps: string[];
}
