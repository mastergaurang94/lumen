package store

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

// AuthTokenRecord stores the hashed magic link token and its lifecycle state.
type AuthTokenRecord struct {
	Email     string
	ExpiresAt time.Time
	Used      bool
}

// Compile-time interface compliance checks.
var (
	_ AuthTokens   = (*AuthTokenStore)(nil)
	_ AuthSessions = (*AuthSessionStore)(nil)
)

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
	UserID    string
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
func (s *AuthSessionStore) Save(sessionID, userID, email string, expiresAt time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.sessions[sessionID] = AuthSessionRecord{
		UserID:    userID,
		Email:     email,
		ExpiresAt: expiresAt,
	}
}

// Validate returns user/session identity data for a valid, unexpired login session token.
func (s *AuthSessionStore) Validate(sessionID string, now time.Time) (AuthSession, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	record, ok := s.sessions[sessionID]
	if !ok || now.After(record.ExpiresAt) {
		return AuthSession{}, false
	}

	return AuthSession{
		UserID: record.UserID,
		Email:  record.Email,
	}, true
}

// Delete removes a login session token.
func (s *AuthSessionStore) Delete(sessionID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.sessions, sessionID)
}

// Compile-time interface compliance check.
var _ UserIdentities = (*UserIdentityStore)(nil)

// UserIdentityStore maps login emails to stable user IDs.
type UserIdentityStore struct {
	mu      sync.RWMutex
	byEmail map[string]string
}

// NewUserIdentityStore constructs an in-memory user identity store.
func NewUserIdentityStore() *UserIdentityStore {
	return &UserIdentityStore{
		byEmail: make(map[string]string),
	}
}

// GetOrCreateByEmail returns a stable user ID for the email.
func (s *UserIdentityStore) GetOrCreateByEmail(email string) string {
	s.mu.Lock()
	defer s.mu.Unlock()

	if existing, ok := s.byEmail[email]; ok && existing != "" {
		return existing
	}

	userID := newUserID()
	s.byEmail[email] = userID
	return userID
}

func newUserID() string {
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		// Extremely unlikely fallback; still unique enough for local in-memory mode.
		return "user-" + hex.EncodeToString([]byte(time.Now().UTC().Format(time.RFC3339Nano)))
	}
	return hex.EncodeToString(raw)
}
