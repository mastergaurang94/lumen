package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCoachingSessionLifecycle(t *testing.T) {
	t.Parallel()

	handler := newTestServer()

	cookie := issueAuthCookie(t, handler)

	startBody, _ := json.Marshal(map[string]string{"session_id": "session-123"})
	startReq := httptest.NewRequest(http.MethodPost, "/v1/sessions/start", bytes.NewReader(startBody))
	startReq.AddCookie(cookie)
	startResp := httptest.NewRecorder()
	handler.ServeHTTP(startResp, startReq)

	if startResp.Code != http.StatusOK {
		t.Fatalf("expected start status 200, got %d", startResp.Code)
	}

	endBody, _ := json.Marshal(map[string]string{
		"session_id":      "session-123",
		"transcript_hash": "abc123",
	})
	endReq := httptest.NewRequest(http.MethodPost, "/v1/sessions/end", bytes.NewReader(endBody))
	endReq.AddCookie(cookie)
	endResp := httptest.NewRecorder()
	handler.ServeHTTP(endResp, endReq)

	if endResp.Code != http.StatusOK {
		t.Fatalf("expected end status 200, got %d", endResp.Code)
	}
}

func issueAuthCookie(t *testing.T, handler http.Handler) *http.Cookie {
	t.Helper()

	requestBody := map[string]string{"email": "person@example.com"}
	bodyBytes, _ := json.Marshal(requestBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/request-link", bytes.NewReader(bodyBytes))
	resp := httptest.NewRecorder()
	handler.ServeHTTP(resp, req)

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

	cookies := verifyResp.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatalf("expected auth session cookie")
	}

	return cookies[0]
}
