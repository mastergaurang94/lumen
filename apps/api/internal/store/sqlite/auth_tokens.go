package sqlite

import (
	"time"

	"github.com/mastergaurang94/lumen/apps/api/internal/store"
)

// Compile-time interface compliance check.
var _ store.AuthTokens = (*AuthTokenStore)(nil)

// AuthTokenStore persists magic-link tokens in SQLite.
type AuthTokenStore struct {
	db *DB
}

// NewAuthTokenStore returns a SQLite-backed auth token store.
func NewAuthTokenStore(db *DB) *AuthTokenStore {
	return &AuthTokenStore{db: db}
}

// Save inserts a new token record.
func (s *AuthTokenStore) Save(tokenHash, email string, expiresAt time.Time) {
	_, _ = s.db.conn.Exec(
		`INSERT OR REPLACE INTO auth_tokens (token_hash, email, expires_at, used) VALUES (?, ?, ?, 0)`,
		tokenHash, email, expiresAt.Format(time.RFC3339),
	)
}

// Consume marks a token as used and returns the associated email when valid.
func (s *AuthTokenStore) Consume(tokenHash string, now time.Time) (string, bool) {
	tx, err := s.db.conn.Begin()
	if err != nil {
		return "", false
	}
	defer func() {
		_ = tx.Rollback()
	}()

	nowStr := now.Format(time.RFC3339)
	res, err := tx.Exec(
		`UPDATE auth_tokens SET used = 1 WHERE token_hash = ? AND used = 0 AND expires_at > ?`,
		tokenHash,
		nowStr,
	)
	if err != nil {
		return "", false
	}

	rows, err := res.RowsAffected()
	if err != nil || rows == 0 {
		return "", false
	}

	var email string
	err = tx.QueryRow(
		`SELECT email FROM auth_tokens WHERE token_hash = ?`,
		tokenHash,
	).Scan(&email)
	if err != nil {
		return "", false
	}

	if err := tx.Commit(); err != nil {
		return "", false
	}

	return email, true
}
