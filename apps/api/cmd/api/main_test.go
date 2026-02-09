package main

import (
	"path/filepath"
	"testing"

	"github.com/mastergaurang94/lumen/apps/api/internal/config"
	"github.com/mastergaurang94/lumen/apps/api/internal/email"
	"github.com/mastergaurang94/lumen/apps/api/internal/store"
	"github.com/mastergaurang94/lumen/apps/api/internal/store/sqlite"
)

func TestBuildDependenciesInMemory(t *testing.T) {
	t.Parallel()

	cfg := config.Config{}
	deps := buildDependencies(cfg)

	if deps.Tokens == nil || deps.Sessions == nil || deps.Coaching == nil || deps.Emailer == nil {
		t.Fatalf("expected dependencies to be initialized")
	}

	if _, ok := deps.Tokens.(*store.AuthTokenStore); !ok {
		t.Fatalf("expected in-memory token store")
	}
	if _, ok := deps.Sessions.(*store.AuthSessionStore); !ok {
		t.Fatalf("expected in-memory session store")
	}
	if _, ok := deps.Coaching.(*store.CoachingSessionStore); !ok {
		t.Fatalf("expected in-memory coaching store")
	}
	if _, ok := deps.Emailer.(*email.DevProvider); !ok {
		t.Fatalf("expected dev email provider")
	}
}

func TestBuildDependenciesSQLiteAndResend(t *testing.T) {
	t.Parallel()

	dbPath := filepath.Join(t.TempDir(), "lumen.db")
	cfg := config.Config{
		DatabaseURL:     dbPath,
		ResendAPIKey:    "re_test",
		ResendFromEmail: "Lumen <lumen@example.com>",
	}

	deps := buildDependencies(cfg)

	if _, ok := deps.Tokens.(*sqlite.AuthTokenStore); !ok {
		t.Fatalf("expected sqlite token store")
	}
	if _, ok := deps.Sessions.(*sqlite.AuthSessionStore); !ok {
		t.Fatalf("expected sqlite session store")
	}
	if _, ok := deps.Coaching.(*sqlite.CoachingSessionStore); !ok {
		t.Fatalf("expected sqlite coaching store")
	}
	if _, ok := deps.Emailer.(*email.ResendProvider); !ok {
		t.Fatalf("expected resend email provider")
	}
}
