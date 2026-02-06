package store

import (
	"sync"
	"time"
)

// AuthTokenRecord stores the hashed magic link token and its lifecycle state.
type AuthTokenRecord struct {
	Email     string
	ExpiresAt time.Time
	Used      bool
}

// AuthTokenStore keeps auth tokens in memory for MVP usage.
type AuthTokenStore struct {
	mu     sync.RWMutex
	tokens map[string]AuthTokenRecord
}

// NewAuthTokenStore constructs an in-memory token store.
func NewAuthTokenStore() *AuthTokenStore {
	return &AuthTokenStore{
		tokens: make(map[string]AuthTokenRecord),
	}
}

// Save inserts a new token record keyed by its hash.
func (s *AuthTokenStore) Save(tokenHash, email string, expiresAt time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.tokens[tokenHash] = AuthTokenRecord{
		Email:     email,
		ExpiresAt: expiresAt,
		Used:      false,
	}
}

// Consume marks a token as used and returns the associated email when valid.
func (s *AuthTokenStore) Consume(tokenHash string, now time.Time) (string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record, ok := s.tokens[tokenHash]
	if !ok || record.Used || now.After(record.ExpiresAt) {
		return "", false
	}

	record.Used = true
	s.tokens[tokenHash] = record
	return record.Email, true
}

// AuthSessionRecord tracks a login session token.
type AuthSessionRecord struct {
	Email     string
	ExpiresAt time.Time
}

// AuthSessionStore holds active login session tokens in memory for MVP usage.
type AuthSessionStore struct {
	mu       sync.RWMutex
	sessions map[string]AuthSessionRecord
}

// NewAuthSessionStore constructs an in-memory login session store.
func NewAuthSessionStore() *AuthSessionStore {
	return &AuthSessionStore{
		sessions: make(map[string]AuthSessionRecord),
	}
}

// Save stores a new login session token.
func (s *AuthSessionStore) Save(sessionID, email string, expiresAt time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.sessions[sessionID] = AuthSessionRecord{
		Email:     email,
		ExpiresAt: expiresAt,
	}
}

// Validate returns the email for a valid, unexpired login session token.
func (s *AuthSessionStore) Validate(sessionID string, now time.Time) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	record, ok := s.sessions[sessionID]
	if !ok || now.After(record.ExpiresAt) {
		return "", false
	}

	return record.Email, true
}

// Delete removes a login session token.
func (s *AuthSessionStore) Delete(sessionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.sessions, sessionID)
}
