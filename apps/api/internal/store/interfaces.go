package store

import "time"

// AuthTokens defines the contract for magic-link token persistence.
type AuthTokens interface {
	Save(tokenHash, email string, expiresAt time.Time)
	Consume(tokenHash string, now time.Time) (string, bool)
}

// AuthSessions defines the contract for login session persistence.
type AuthSessions interface {
	Save(sessionID, email string, expiresAt time.Time)
	Validate(sessionID string, now time.Time) (string, bool)
	Delete(sessionID string)
}

// CoachingSessions defines the contract for coaching session metadata persistence.
type CoachingSessions interface {
	Start(sessionID, userID string, startedAt time.Time)
	End(sessionID, userID, transcriptHash string, endedAt time.Time)
}
