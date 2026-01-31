package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	"github.com/mastergaurang94/lumen/apps/api/internal/config"
	"github.com/mastergaurang94/lumen/apps/api/internal/httpx"
	apimiddleware "github.com/mastergaurang94/lumen/apps/api/internal/middleware"
)

// New assembles the API router with core middleware and versioned routes.
func New(cfg config.Config) http.Handler {
	router := chi.NewRouter()

	router.Use(apimiddleware.RequestID())
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.WebOrigins,
		AllowCredentials: true,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-Id"},
		ExposedHeaders:   []string{"X-Request-Id"},
		MaxAge:           300,
	}))

	router.Route("/v1", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
			httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
		})
	})

	return router
}
