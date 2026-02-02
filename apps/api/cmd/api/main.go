package main

import (
	"context"
	"log"
	"net/http"

	"github.com/mastergaurang94/lumen/apps/api/internal/config"
	"github.com/mastergaurang94/lumen/apps/api/internal/observability"
	"github.com/mastergaurang94/lumen/apps/api/internal/server"
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

	router := server.New(cfg)

	httpServer := &http.Server{
		Addr:    cfg.Addr,
		Handler: router,
	}

	log.Printf("api listening on %s", cfg.Addr)
	if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
