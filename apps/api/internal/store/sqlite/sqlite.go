// Package sqlite provides persistent store implementations backed by SQLite.
package sqlite

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite" // Pure-Go SQLite driver, no CGO required.
)

// DB wraps a sql.DB connection with schema migration.
type DB struct {
	conn *sql.DB
}

// Open creates a SQLite database connection and runs schema migrations.
func Open(dsn string) (*DB, error) {
	conn, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("sqlite open: %w", err)
	}

	// Enable WAL mode for better concurrent read performance.
	if _, err := conn.Exec("PRAGMA journal_mode=WAL"); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("sqlite wal pragma: %w", err)
	}

	db := &DB{conn: conn}
	if err := db.migrate(); err != nil {
		_ = conn.Close()
		return nil, err
	}

	return db, nil
}

// Close shuts down the database connection.
func (db *DB) Close() error {
	return db.conn.Close()
}

func (db *DB) migrate() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS auth_tokens (
			token_hash TEXT PRIMARY KEY,
			email      TEXT NOT NULL,
			expires_at TEXT NOT NULL,
			used       INTEGER NOT NULL DEFAULT 0
		)`,
		`CREATE TABLE IF NOT EXISTS auth_sessions (
			session_id TEXT PRIMARY KEY,
			email      TEXT NOT NULL,
			expires_at TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS coaching_sessions (
			session_id      TEXT PRIMARY KEY,
			user_id         TEXT NOT NULL,
			started_at      TEXT NOT NULL,
			ended_at        TEXT,
			transcript_hash TEXT
		)`,
	}

	for _, stmt := range statements {
		if _, err := db.conn.Exec(stmt); err != nil {
			return fmt.Errorf("sqlite migrate: %w", err)
		}
	}

	return nil
}
