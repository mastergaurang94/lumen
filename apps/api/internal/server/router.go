package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	"github.com/mastergaurang94/lumen/apps/api/internal/config"
	"github.com/mastergaurang94/lumen/apps/api/internal/email"
	"github.com/mastergaurang94/lumen/apps/api/internal/handlers"
	"github.com/mastergaurang94/lumen/apps/api/internal/httpx"
	apimiddleware "github.com/mastergaurang94/lumen/apps/api/internal/middleware"
	"github.com/mastergaurang94/lumen/apps/api/internal/observability"
	"github.com/mastergaurang94/lumen/apps/api/internal/store"
)

// Dependencies holds injectable service implementations for the API server.
type Dependencies struct {
	Tokens   store.AuthTokens
	Sessions store.AuthSessions
	Coaching store.CoachingSessions
	Emailer  email.Provider
}

// New assembles the API router with core middleware and versioned routes.
func New(cfg config.Config, deps Dependencies) http.Handler {
	router := chi.NewRouter()

	router.Use(apimiddleware.RequestID())
	router.Use(observability.TraceRequests())
	router.Use(observability.RequestLogger())
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.WebOrigins,
		AllowCredentials: true,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-Id"},
		ExposedHeaders:   []string{"X-Request-Id"},
		MaxAge:           300,
	}))

	authHandler := handlers.NewAuthHandler(cfg, deps.Tokens, deps.Sessions, deps.Emailer)
	coachingSessionsHandler := handlers.NewCoachingSessionsHandler(deps.Coaching)

	router.Route("/v1", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
			httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
		})
		r.Route("/auth", func(r chi.Router) {
			r.Post("/request-link", authHandler.RequestLink)
			r.Post("/verify", authHandler.Verify)
			r.With(apimiddleware.RequireAuthSession(cfg, deps.Sessions)).Get(
				"/session",
				authHandler.SessionStatus,
			)
			r.Post("/logout", authHandler.Logout)
		})
		r.Route("/sessions", func(r chi.Router) {
			r.Use(apimiddleware.RequireAuthSession(cfg, deps.Sessions))
			r.Post("/start", coachingSessionsHandler.Start)
			r.Post("/end", coachingSessionsHandler.End)
		})
	})

	return router
}
