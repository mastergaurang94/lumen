package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/mastergaurang94/lumen/apps/api/internal/config"
	"github.com/mastergaurang94/lumen/apps/api/internal/httpx"
	"github.com/mastergaurang94/lumen/apps/api/internal/store"
)

type contextKey string

const userIDKey contextKey = "userID"

// RequireAuthSession enforces a valid auth session cookie and stores the user ID in context.
func RequireAuthSession(cfg config.Config, sessions store.AuthSessions) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie(cfg.AuthCookieName)
			if err != nil || cookie.Value == "" {
				httpx.WriteError(w, r, http.StatusUnauthorized, "unauthorized", "Authentication required.")
				return
			}

			userID, ok := sessions.Validate(cookie.Value, time.Now())
			if !ok {
				httpx.WriteError(w, r, http.StatusUnauthorized, "unauthorized", "Authentication required.")
				return
			}

			ctx := context.WithValue(r.Context(), userIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserIDFromContext returns the authenticated user ID, if present.
func UserIDFromContext(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(userIDKey).(string)
	return userID, ok
}
