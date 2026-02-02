package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/mastergaurang94/lumen/apps/api/internal/httpx"
	apimiddleware "github.com/mastergaurang94/lumen/apps/api/internal/middleware"
	"github.com/mastergaurang94/lumen/apps/api/internal/store"
)

// SessionsHandler implements session metadata endpoints.
type SessionsHandler struct {
	store *store.SessionMetadataStore
	clock func() time.Time
}

// NewSessionsHandler wires dependencies for session metadata routes.
func NewSessionsHandler(store *store.SessionMetadataStore) *SessionsHandler {
	return &SessionsHandler{
		store: store,
		clock: time.Now,
	}
}

type sessionStartPayload struct {
	SessionID string `json:"session_id"`
}

// Start handles POST /v1/sessions/start.
func (h *SessionsHandler) Start(w http.ResponseWriter, r *http.Request) {
	var payload sessionStartPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "invalid_json", "Invalid JSON payload.")
		return
	}

	sessionID := strings.TrimSpace(payload.SessionID)
	if sessionID == "" {
		httpx.WriteError(w, r, http.StatusBadRequest, "missing_session_id", "Session ID is required.")
		return
	}

	userID, ok := apimiddleware.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, r, http.StatusUnauthorized, "unauthorized", "Authentication required.")
		return
	}

	h.store.Start(sessionID, userID, h.clock())
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

type sessionEndPayload struct {
	SessionID      string `json:"session_id"`
	TranscriptHash string `json:"transcript_hash"`
}

// End handles POST /v1/sessions/end.
func (h *SessionsHandler) End(w http.ResponseWriter, r *http.Request) {
	var payload sessionEndPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		httpx.WriteError(w, r, http.StatusBadRequest, "invalid_json", "Invalid JSON payload.")
		return
	}

	sessionID := strings.TrimSpace(payload.SessionID)
	if sessionID == "" {
		httpx.WriteError(w, r, http.StatusBadRequest, "missing_session_id", "Session ID is required.")
		return
	}
	transcriptHash := strings.TrimSpace(payload.TranscriptHash)
	if transcriptHash == "" {
		httpx.WriteError(w, r, http.StatusBadRequest, "missing_transcript_hash", "Transcript hash is required.")
		return
	}

	userID, ok := apimiddleware.UserIDFromContext(r.Context())
	if !ok {
		httpx.WriteError(w, r, http.StatusUnauthorized, "unauthorized", "Authentication required.")
		return
	}

	h.store.End(sessionID, userID, transcriptHash, h.clock())
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
