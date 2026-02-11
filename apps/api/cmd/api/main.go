package main

import (
	"context"
	"log"
	"net/http"

	"github.com/mastergaurang94/lumen/apps/api/internal/config"
	"github.com/mastergaurang94/lumen/apps/api/internal/email"
	"github.com/mastergaurang94/lumen/apps/api/internal/observability"
	"github.com/mastergaurang94/lumen/apps/api/internal/server"
	"github.com/mastergaurang94/lumen/apps/api/internal/store"
	"github.com/mastergaurang94/lumen/apps/api/internal/store/sqlite"
)

func main() {
	cfg := config.Load()

	shutdownTracing, err := observability.InitTracing(cfg)
	if err != nil {
		log.Fatalf("tracing init error: %v", err)
	}
	defer func() {
		if err := shutdownTracing(context.Background()); err != nil {
			log.Printf("tracing shutdown error: %v", err)
		}
	}()

	deps := buildDependencies(cfg)

	router := server.New(cfg, deps)

	httpServer := &http.Server{
		Addr:    cfg.Addr,
		Handler: router,
	}

	log.Printf("api listening on %s", cfg.Addr)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}

func buildDependencies(cfg config.Config) server.Dependencies {
	var deps server.Dependencies

	if cfg.DatabaseURL != "" {
		db, err := sqlite.Open(cfg.DatabaseURL)
		if err != nil {
			log.Fatalf("sqlite open error: %v", err)
		}
		deps.Tokens = sqlite.NewAuthTokenStore(db)
		deps.Sessions = sqlite.NewAuthSessionStore(db)
		deps.Users = sqlite.NewUserIdentityStore(db)
		deps.Coaching = sqlite.NewCoachingSessionStore(db)
		log.Printf("using sqlite store: %s", cfg.DatabaseURL)
	} else {
		deps.Tokens = store.NewAuthTokenStore()
		deps.Sessions = store.NewAuthSessionStore()
		deps.Users = store.NewUserIdentityStore()
		deps.Coaching = store.NewCoachingSessionStore()
		log.Print("using in-memory store")
	}

	if cfg.ResendAPIKey != "" {
		deps.Emailer = email.NewResendProvider(cfg.ResendAPIKey, cfg.ResendFromEmail)
		log.Print("using resend email provider")
	} else {
		deps.Emailer = &email.DevProvider{}
		log.Print("using dev email provider (console)")
	}

	return deps
}
