package sqlite

import (
	"time"

	"github.com/mastergaurang94/lumen/apps/api/internal/store"
)

// Compile-time interface compliance check.
var _ store.CoachingSessions = (*CoachingSessionStore)(nil)

// CoachingSessionStore persists coaching session metadata in SQLite.
type CoachingSessionStore struct {
	db *DB
}

// NewCoachingSessionStore returns a SQLite-backed coaching session store.
func NewCoachingSessionStore(db *DB) *CoachingSessionStore {
	return &CoachingSessionStore{db: db}
}

// Start records a session start time.
func (s *CoachingSessionStore) Start(sessionID, userID string, startedAt time.Time) {
	_, _ = s.db.conn.Exec(
		`INSERT OR REPLACE INTO coaching_sessions (session_id, user_id, started_at) VALUES (?, ?, ?)`,
		sessionID, userID, startedAt.Format(time.RFC3339),
	)
}

// End records a session end time and transcript hash.
func (s *CoachingSessionStore) End(sessionID, userID, transcriptHash string, endedAt time.Time) {
	// Try updating existing record first.
	res, _ := s.db.conn.Exec(
		`UPDATE coaching_sessions SET user_id = ?, transcript_hash = ?, ended_at = ? WHERE session_id = ?`,
		userID, transcriptHash, endedAt.Format(time.RFC3339), sessionID,
	)

	// If no row existed, insert a new one with started_at = ended_at as fallback.
	if rows, _ := res.RowsAffected(); rows == 0 {
		_, _ = s.db.conn.Exec(
			`INSERT INTO coaching_sessions (session_id, user_id, started_at, ended_at, transcript_hash) VALUES (?, ?, ?, ?, ?)`,
			sessionID, userID, endedAt.Format(time.RFC3339), endedAt.Format(time.RFC3339), transcriptHash,
		)
	}
}
