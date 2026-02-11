package sqlite

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"time"

	"github.com/mastergaurang94/lumen/apps/api/internal/store"
)

// Compile-time interface compliance check.
var _ store.UserIdentities = (*UserIdentityStore)(nil)

// UserIdentityStore persists stable email -> user_id mappings.
type UserIdentityStore struct {
	db *DB
}

// NewUserIdentityStore returns a SQLite-backed user identity store.
func NewUserIdentityStore(db *DB) *UserIdentityStore {
	return &UserIdentityStore{db: db}
}

// GetOrCreateByEmail returns a stable user ID for the given email.
func (s *UserIdentityStore) GetOrCreateByEmail(email string) string {
	var existingUserID string
	err := s.db.conn.QueryRow(`SELECT user_id FROM users WHERE email = ?`, email).Scan(&existingUserID)
	if err == nil && existingUserID != "" {
		return existingUserID
	}
	if err != nil && err != sql.ErrNoRows {
		return ""
	}

	userID := newUserID()
	now := time.Now().UTC().Format(time.RFC3339)
	if _, err := s.db.conn.Exec(
		`INSERT OR IGNORE INTO users (user_id, email, created_at) VALUES (?, ?, ?)`,
		userID,
		email,
		now,
	); err != nil {
		return ""
	}

	// Re-read to handle races where another request inserted first.
	err = s.db.conn.QueryRow(`SELECT user_id FROM users WHERE email = ?`, email).Scan(&existingUserID)
	if err == nil && existingUserID != "" {
		return existingUserID
	}

	return ""
}

func newUserID() string {
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return "user-" + hex.EncodeToString([]byte(time.Now().UTC().Format(time.RFC3339Nano)))
	}
	return hex.EncodeToString(raw)
}
