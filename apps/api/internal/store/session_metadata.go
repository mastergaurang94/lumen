package store

import (
	"sync"
	"time"
)

// SessionMetadata captures server-side session lifecycle metadata.
type SessionMetadata struct {
	SessionID      string
	UserID         string
	StartedAt      time.Time
	EndedAt        *time.Time
	TranscriptHash string
}

// SessionMetadataStore stores session metadata in memory for MVP usage.
type SessionMetadataStore struct {
	mu       sync.RWMutex
	sessions map[string]SessionMetadata
}

// NewSessionMetadataStore constructs an in-memory session metadata store.
func NewSessionMetadataStore() *SessionMetadataStore {
	return &SessionMetadataStore{
		sessions: make(map[string]SessionMetadata),
	}
}

// Start records a session start time.
func (s *SessionMetadataStore) Start(sessionID, userID string, startedAt time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record := s.sessions[sessionID]
	record.SessionID = sessionID
	record.UserID = userID
	record.StartedAt = startedAt
	s.sessions[sessionID] = record
}

// End records a session end time and transcript hash.
func (s *SessionMetadataStore) End(sessionID, userID, transcriptHash string, endedAt time.Time) {
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
