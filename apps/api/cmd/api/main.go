package main

import (
	"log"
	"net/http"

	"github.com/mastergaurang94/lumen/apps/api/internal/config"
	"github.com/mastergaurang94/lumen/apps/api/internal/server"
)

func main() {
	cfg := config.Load()
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
