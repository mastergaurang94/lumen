package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/mastergaurang94/lumen/apps/api/internal/config"
	"github.com/mastergaurang94/lumen/apps/api/internal/server"
)

func TestAuthRequestAndVerifyFlow(t *testing.T) {
	t.Parallel()

	handler := newTestServer()

	requestBody := map[string]string{"email": "person@example.com"}
	bodyBytes, _ := json.Marshal(requestBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/request-link", bytes.NewReader(bodyBytes))
	resp := httptest.NewRecorder()

	handler.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.Code)
	}

	var payload map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	link, ok := payload["magic_link"].(string)
	if !ok || link == "" {
		t.Fatalf("expected magic_link in response")
	}

	token := extractToken(t, link)
	verifyBody, _ := json.Marshal(map[string]string{"token": token})
	verifyReq := httptest.NewRequest(http.MethodPost, "/v1/auth/verify", bytes.NewReader(verifyBody))
	verifyResp := httptest.NewRecorder()

	handler.ServeHTTP(verifyResp, verifyReq)

	if verifyResp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", verifyResp.Code)
	}

	cookies := verifyResp.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatalf("expected auth session cookie")
	}

	sessionReq := httptest.NewRequest(http.MethodGet, "/v1/auth/session", nil)
	sessionReq.AddCookie(cookies[0])
	sessionResp := httptest.NewRecorder()

	handler.ServeHTTP(sessionResp, sessionReq)

	if sessionResp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", sessionResp.Code)
	}

	unauthReq := httptest.NewRequest(http.MethodGet, "/v1/auth/session", nil)
	unauthResp := httptest.NewRecorder()

	handler.ServeHTTP(unauthResp, unauthReq)

	if unauthResp.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", unauthResp.Code)
	}
}

func TestAuthLogoutClearsSession(t *testing.T) {
	t.Parallel()

	handler := newTestServer()

	requestBody := map[string]string{"email": "person@example.com"}
	bodyBytes, _ := json.Marshal(requestBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/request-link", bytes.NewReader(bodyBytes))
	resp := httptest.NewRecorder()

	handler.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.Code)
	}

	var payload map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	link, ok := payload["magic_link"].(string)
	if !ok || link == "" {
		t.Fatalf("expected magic_link in response")
	}

	token := extractToken(t, link)
	verifyBody, _ := json.Marshal(map[string]string{"token": token})
	verifyReq := httptest.NewRequest(http.MethodPost, "/v1/auth/verify", bytes.NewReader(verifyBody))
	verifyResp := httptest.NewRecorder()

	handler.ServeHTTP(verifyResp, verifyReq)

	if verifyResp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", verifyResp.Code)
	}

	cookies := verifyResp.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatalf("expected auth session cookie")
	}

	logoutReq := httptest.NewRequest(http.MethodPost, "/v1/auth/logout", nil)
	logoutReq.AddCookie(cookies[0])
	logoutResp := httptest.NewRecorder()

	handler.ServeHTTP(logoutResp, logoutReq)

	if logoutResp.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", logoutResp.Code)
	}

	sessionReq := httptest.NewRequest(http.MethodGet, "/v1/auth/session", nil)
	sessionReq.AddCookie(cookies[0])
	sessionResp := httptest.NewRecorder()

	handler.ServeHTTP(sessionResp, sessionReq)

	if sessionResp.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", sessionResp.Code)
	}
}

func newTestServer() http.Handler {
	cfg := config.Config{
		Env:             "development",
		Addr:            ":0",
		WebOrigins:      []string{"http://localhost:3000"},
		AppURL:          "http://localhost:3000",
		AuthTokenTTL:    15 * time.Minute,
		SessionTTL:      30 * time.Minute,
		AuthTokenSecret: "test-secret",
		AuthCookieName:  "lumen_session",
	}

	return server.New(cfg)
}

func extractToken(t *testing.T, rawLink string) string {
	t.Helper()

	parsed, err := url.Parse(rawLink)
	if err != nil {
		t.Fatalf("parse magic link: %v", err)
	}

	token := parsed.Query().Get("token")
	if token == "" {
		t.Fatalf("missing token in magic link")
	}

	return token
}
