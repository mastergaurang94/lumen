/**
 * Session-related type definitions.
 */

export type SessionState = 'loading' | 'active' | 'complete' | 'unavailable' | 'error';

export type SessionGateState = 'locked' | 'unlocked';

export interface SessionGate {
  state: SessionGateState;
  nextAvailable: Date | null;
  lastSessionDate: Date | null;
  hasActiveSession: boolean;
}

export type MessageRole = 'coach' | 'user';

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
  nextSessionDate: Date;
}
