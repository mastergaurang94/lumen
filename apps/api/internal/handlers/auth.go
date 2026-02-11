package handlers

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5/middleware"

	"github.com/mastergaurang94/lumen/apps/api/internal/config"
	"github.com/mastergaurang94/lumen/apps/api/internal/email"
	"github.com/mastergaurang94/lumen/apps/api/internal/httpx"
	apimiddleware "github.com/mastergaurang94/lumen/apps/api/internal/middleware"
	"github.com/mastergaurang94/lumen/apps/api/internal/store"
)

const (
	rateLimitPerMinute = 5
	rateLimitPerHour   = 20
)

// AuthHandler implements magic-link authentication endpoints.
type AuthHandler struct {
	cfg         config.Config
	tokens      store.AuthTokens
	sessions    store.AuthSessions
	users       store.UserIdentities
	emailer     email.Provider
	rateLimiter *RateLimiter
	clock       func() time.Time
	randomBytes func(n int) ([]byte, error)
}

// NewAuthHandler wires dependencies for auth routes.
func NewAuthHandler(
	cfg config.Config,
	tokens store.AuthTokens,
	sessions store.AuthSessions,
	users store.UserIdentities,
	emailer email.Provider,
) *AuthHandler {
	return &AuthHandler{
		cfg:         cfg,
		tokens:      tokens,
		sessions:    sessions,
		users:       users,
		emailer:     emailer,
		rateLimiter: NewRateLimiter(),
		clock:       time.Now,
		randomBytes: randomBytes,
	}
}

type requestLinkPayload struct {
	Email string `json:"email"`
}

// RequestLink handles POST /v1/auth/request-link.
func (h *AuthHandler) RequestLink(w http.ResponseWriter, r *http.Request) {
	var payload requestLinkPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "invalid_json", "Invalid JSON payload.")
		return
	}

	emailAddr := strings.TrimSpace(strings.ToLower(payload.Email))
	if !isValidEmail(emailAddr) {
		httpx.WriteError(w, r, http.StatusBadRequest, "invalid_email", "Email is required.")
		return
	}

	ip := clientIP(r)
	now := h.clock()
	if !h.rateLimiter.Allow("ip:"+ip, rateLimitPerMinute, time.Minute, now) {
		httpx.WriteError(w, r, http.StatusTooManyRequests, "rate_limited", "Too many requests.")
		return
	}
	if !h.rateLimiter.Allow("ip:"+ip, rateLimitPerHour, time.Hour, now) {
		httpx.WriteError(w, r, http.StatusTooManyRequests, "rate_limited", "Too many requests.")
		return
	}
	if !h.rateLimiter.Allow("email:"+emailAddr, rateLimitPerMinute, time.Minute, now) {
		httpx.WriteError(w, r, http.StatusTooManyRequests, "rate_limited", "Too many requests.")
		return
	}
	if !h.rateLimiter.Allow("email:"+emailAddr, rateLimitPerHour, time.Hour, now) {
		httpx.WriteError(w, r, http.StatusTooManyRequests, "rate_limited", "Too many requests.")
		return
	}

	rawToken, err := h.generateToken(32)
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "token_error", "Unable to issue token.")
		return
	}

	expiresAt := now.Add(h.cfg.AuthTokenTTL)
	tokenHash := h.hashToken(rawToken)
	h.tokens.Save(tokenHash, emailAddr, expiresAt)

	link := h.magicLink(rawToken)
	if err := h.emailer.SendMagicLink(r.Context(), emailAddr, link); err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "email_error", "Unable to deliver magic link.")
		return
	}

	h.logEvent(r, "auth_request")

	response := map[string]any{"status": "ok"}
	if h.cfg.Env == "development" {
		response["magic_link"] = link
	}

	httpx.WriteJSON(w, http.StatusOK, response)
}

type verifyPayload struct {
	Token string `json:"token"`
}

// Verify handles POST /v1/auth/verify.
func (h *AuthHandler) Verify(w http.ResponseWriter, r *http.Request) {
	var payload verifyPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "invalid_json", "Invalid JSON payload.")
		return
	}

	rawToken := strings.TrimSpace(payload.Token)
	if rawToken == "" {
		httpx.WriteError(w, r, http.StatusBadRequest, "missing_token", "Token is required.")
		return
	}

	now := h.clock()
	tokenHash := h.hashToken(rawToken)
	emailAddr, ok := h.tokens.Consume(tokenHash, now)
	if !ok {
		httpx.WriteError(w, r, http.StatusUnauthorized, "invalid_token", "Token is invalid or expired.")
		return
	}

	sessionID, err := h.generateToken(32)
	if err != nil {
		httpx.WriteError(w, r, http.StatusInternalServerError, "session_error", "Unable to create session.")
		return
	}

	expiresAt := now.Add(h.cfg.SessionTTL)
	userID := h.users.GetOrCreateByEmail(emailAddr)
	if userID == "" {
		httpx.WriteError(w, r, http.StatusInternalServerError, "session_error", "Unable to create session.")
		return
	}
	h.sessions.Save(sessionID, userID, emailAddr, expiresAt)

	http.SetCookie(w, &http.Cookie{
		Name:     h.cfg.AuthCookieName,
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		Secure:   h.cfg.Env != "development",
		SameSite: http.SameSiteLaxMode,
		Expires:  expiresAt,
	})

	h.logEvent(r, "auth_verify")

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// SessionStatus handles GET /v1/auth/session.
func (h *AuthHandler) SessionStatus(w http.ResponseWriter, r *http.Request) {
	userID, _ := apimiddleware.UserIDFromContext(r.Context())
	emailAddr, _ := apimiddleware.UserEmailFromContext(r.Context())
	response := map[string]string{"status": "ok"}
	if userID != "" {
		response["user_id"] = userID
	}
	if emailAddr != "" {
		response["email"] = emailAddr
	}
	httpx.WriteJSON(w, http.StatusOK, response)
}

// Logout handles POST /v1/auth/logout.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(h.cfg.AuthCookieName)
	if err == nil && cookie.Value != "" {
		h.sessions.Delete(cookie.Value)
	}

	http.SetCookie(w, &http.Cookie{
		Name:     h.cfg.AuthCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   h.cfg.Env != "development",
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
	})

	h.logEvent(r, "auth_logout")

	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *AuthHandler) hashToken(token string) string {
	mac := hmac.New(sha256.New, []byte(h.cfg.AuthTokenSecret))
	_, _ = mac.Write([]byte(token))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func (h *AuthHandler) magicLink(token string) string {
	base := strings.TrimRight(h.cfg.AppURL, "/")
	return base + "/login/callback?token=" + token
}

func (h *AuthHandler) generateToken(size int) (string, error) {
	bytes, err := h.randomBytes(size)
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(bytes), nil
}

func randomBytes(size int) ([]byte, error) {
	buf := make([]byte, size)
	_, err := rand.Read(buf)
	return buf, err
}

func (h *AuthHandler) logEvent(r *http.Request, event string) {
	requestID := middleware.GetReqID(r.Context())
	log.Printf("auth_event=%s request_id=%s", event, requestID)
}

// RateLimiter provides a simple in-memory limiter keyed by a string.
type RateLimiter struct {
	mu      sync.Mutex
	entries map[string]rateEntry
}

type rateEntry struct {
	WindowStart time.Time
	Count       int
}

// NewRateLimiter constructs an in-memory rate limiter.
func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		entries: make(map[string]rateEntry),
	}
}

// Allow returns true when the key is under the limit for the given window.
func (l *RateLimiter) Allow(key string, limit int, window time.Duration, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	entry := l.entries[key]
	if entry.WindowStart.IsZero() || now.Sub(entry.WindowStart) >= window {
		entry.WindowStart = now
		entry.Count = 0
	}

	entry.Count++
	l.entries[key] = entry

	return entry.Count <= limit
}

func clientIP(r *http.Request) string {
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		return strings.TrimSpace(parts[0])
	}

	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func isValidEmail(email string) bool {
	if email == "" || !strings.Contains(email, "@") {
		return false
	}
	return true
}
