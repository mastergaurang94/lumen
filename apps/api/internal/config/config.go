package config

import (
	"os"
	"strings"
)

// Config captures API runtime configuration loaded from environment variables.
type Config struct {
	Env         string
	Addr        string
	WebOrigins  []string
	DatabaseURL string
	RedisURL    string
	ProviderKey string
}

// Load reads environment variables and applies sensible defaults for local development.
func Load() Config {
	webOrigins := splitCSV(getEnv("WEB_ORIGINS", ""))
	if len(webOrigins) == 0 {
		webOrigins = []string{getEnv("WEB_ORIGIN", "http://localhost:3000")}
	}

	return Config{
		Env:         getEnv("APP_ENV", "development"),
		Addr:        getEnv("API_ADDR", ":8080"),
		WebOrigins:  webOrigins,
		DatabaseURL: getEnv("DATABASE_URL", ""),
		RedisURL:    getEnv("REDIS_URL", ""),
		ProviderKey: getEnv("LLM_PROVIDER_KEY", ""),
	}
}

func getEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func splitCSV(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}

	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
