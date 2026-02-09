package sqlite

import (
	"time"

	"github.com/mastergaurang94/lumen/apps/api/internal/store"
)

// Compile-time interface compliance check.
var _ store.AuthSessions = (*AuthSessionStore)(nil)

// AuthSessionStore persists login sessions in SQLite.
type AuthSessionStore struct {
	db *DB
}

// NewAuthSessionStore returns a SQLite-backed auth session store.
func NewAuthSessionStore(db *DB) *AuthSessionStore {
	return &AuthSessionStore{db: db}
}

// Save stores a new login session.
func (s *AuthSessionStore) Save(sessionID, email string, expiresAt time.Time) {
	_, _ = s.db.conn.Exec(
		`INSERT OR REPLACE INTO auth_sessions (session_id, email, expires_at) VALUES (?, ?, ?)`,
		sessionID, email, expiresAt.Format(time.RFC3339),
	)
}

// Validate returns the email for a valid, unexpired session.
func (s *AuthSessionStore) Validate(sessionID string, now time.Time) (string, bool) {
	var email, expiresAtStr string
	err := s.db.conn.QueryRow(
		`SELECT email, expires_at FROM auth_sessions WHERE session_id = ?`,
		sessionID,
	).Scan(&email, &expiresAtStr)
	if err != nil {
		return "", false
	}

	expiresAt, err := time.Parse(time.RFC3339, expiresAtStr)
	if err != nil || now.After(expiresAt) {
		return "", false
	}

	return email, true
}

// Delete removes a login session.
func (s *AuthSessionStore) Delete(sessionID string) {
	_, _ = s.db.conn.Exec(`DELETE FROM auth_sessions WHERE session_id = ?`, sessionID)
}
