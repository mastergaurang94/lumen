package store

import (
	"sync"
	"time"
)

// CoachingSession captures server-side coaching session lifecycle metadata.
type CoachingSession struct {
	SessionID      string
	UserID         string
	StartedAt      time.Time
	EndedAt        *time.Time
	TranscriptHash string
}

// Compile-time interface compliance check.
var _ CoachingSessions = (*CoachingSessionStore)(nil)

// CoachingSessionStore stores coaching session metadata in memory for MVP usage.
type CoachingSessionStore struct {
	mu       sync.RWMutex
	sessions map[string]CoachingSession
}

// NewCoachingSessionStore constructs an in-memory coaching session metadata store.
func NewCoachingSessionStore() *CoachingSessionStore {
	return &CoachingSessionStore{
		sessions: make(map[string]CoachingSession),
	}
}

// Start records a session start time.
func (s *CoachingSessionStore) Start(sessionID, userID string, startedAt time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record := s.sessions[sessionID]
	record.SessionID = sessionID
	record.UserID = userID
	record.StartedAt = startedAt
	s.sessions[sessionID] = record
}

// End records a session end time and transcript hash.
func (s *CoachingSessionStore) End(sessionID, userID, transcriptHash string, endedAt time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record := s.sessions[sessionID]
	record.SessionID = sessionID
	record.UserID = userID
	record.TranscriptHash = transcriptHash
	record.EndedAt = &endedAt
	if record.StartedAt.IsZero() {
		record.StartedAt = endedAt
	}
	s.sessions[sessionID] = record
}
