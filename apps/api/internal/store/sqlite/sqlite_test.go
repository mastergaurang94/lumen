package sqlite

import (
	"path/filepath"
	"testing"
	"time"
)

func openTestDB(t *testing.T) *DB {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "lumen-test.db")
	db, err := Open(dbPath)
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}

	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Fatalf("close sqlite db: %v", err)
		}
	})

	return db
}

func TestAuthTokenConsumeSingleUse(t *testing.T) {
	t.Parallel()

	db := openTestDB(t)
	store := NewAuthTokenStore(db)

	now := time.Now().UTC().Truncate(time.Second)
	expiresAt := now.Add(10 * time.Minute)
	tokenHash := "token-hash"
	email := "person@example.com"

	store.Save(tokenHash, email, expiresAt)

	if gotEmail, ok := store.Consume(tokenHash, now); !ok || gotEmail != email {
		t.Fatalf("expected first consume to return %q, got %q (ok=%v)", email, gotEmail, ok)
	}

	if gotEmail, ok := store.Consume(tokenHash, now); ok || gotEmail != "" {
		t.Fatalf("expected second consume to fail, got %q (ok=%v)", gotEmail, ok)
	}
}

func TestAuthSessionValidateAndDelete(t *testing.T) {
	t.Parallel()

	db := openTestDB(t)
	store := NewAuthSessionStore(db)

	now := time.Now().UTC().Truncate(time.Second)
	expiresAt := now.Add(30 * time.Minute)
	sessionID := "session-123"
	userID := "user-123"
	email := "person@example.com"

	store.Save(sessionID, userID, email, expiresAt)

	session, ok := store.Validate(sessionID, now)
	if !ok {
		t.Fatalf("expected validate ok")
	}
	if session.Email != email {
		t.Fatalf("expected email %q, got %q", email, session.Email)
	}
	if session.UserID != userID {
		t.Fatalf("expected user_id %q, got %q", userID, session.UserID)
	}

	store.Delete(sessionID)
	if gotSession, ok := store.Validate(sessionID, now); ok || gotSession.Email != "" {
		t.Fatalf("expected validate after delete to fail, got %#v (ok=%v)", gotSession, ok)
	}
}

func TestUserIdentityStablePerEmail(t *testing.T) {
	t.Parallel()

	db := openTestDB(t)
	store := NewUserIdentityStore(db)

	first := store.GetOrCreateByEmail("person@example.com")
	second := store.GetOrCreateByEmail("person@example.com")
	third := store.GetOrCreateByEmail("other@example.com")

	if first == "" || second == "" || third == "" {
		t.Fatalf("expected non-empty user IDs")
	}
	if first != second {
		t.Fatalf("expected stable user ID for same email")
	}
	if first == third {
		t.Fatalf("expected distinct user IDs for different emails")
	}
}

func TestCoachingSessionLifecycle(t *testing.T) {
	t.Parallel()

	db := openTestDB(t)
	store := NewCoachingSessionStore(db)

	startTime := time.Now().UTC().Truncate(time.Second)
	endTime := startTime.Add(5 * time.Minute)
	sessionID := "session-abc"
	userID := "user@example.com"
	transcriptHash := "hash123"

	store.Start(sessionID, userID, startTime)
	store.End(sessionID, userID, transcriptHash, endTime)

	var storedUserID string
	var storedTranscript string
	var storedStarted string
	var storedEnded string
	err := db.conn.QueryRow(
		`SELECT user_id, transcript_hash, started_at, ended_at FROM coaching_sessions WHERE session_id = ?`,
		sessionID,
	).Scan(&storedUserID, &storedTranscript, &storedStarted, &storedEnded)
	if err != nil {
		t.Fatalf("query coaching session: %v", err)
	}

	if storedUserID != userID {
		t.Fatalf("expected user_id %q, got %q", userID, storedUserID)
	}
	if storedTranscript != transcriptHash {
		t.Fatalf("expected transcript_hash %q, got %q", transcriptHash, storedTranscript)
	}
	if storedStarted == "" || storedEnded == "" {
		t.Fatalf("expected started_at and ended_at to be set")
	}
}

func TestCoachingSessionEndWithoutStart(t *testing.T) {
	t.Parallel()

	db := openTestDB(t)
	store := NewCoachingSessionStore(db)

	endTime := time.Now().UTC().Truncate(time.Second)
	sessionID := "session-missing"
	userID := "user@example.com"
	transcriptHash := "hash456"

	store.End(sessionID, userID, transcriptHash, endTime)

	var storedStarted string
	var storedEnded string
	err := db.conn.QueryRow(
		`SELECT started_at, ended_at FROM coaching_sessions WHERE session_id = ?`,
		sessionID,
	).Scan(&storedStarted, &storedEnded)
	if err != nil {
		t.Fatalf("query coaching session: %v", err)
	}

	if storedStarted != storedEnded {
		t.Fatalf("expected started_at to equal ended_at when start missing")
	}
}
