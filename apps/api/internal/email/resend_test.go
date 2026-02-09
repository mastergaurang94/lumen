package email

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type resendTestPayload struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

func TestResendProviderSendsExpectedPayload(t *testing.T) {
	t.Parallel()

	var gotPayload resendTestPayload
	var gotAuth string

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		gotAuth = r.Header.Get("Authorization")
		if err := json.NewDecoder(r.Body).Decode(&gotPayload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"id":"test"}`))
	}))
	defer srv.Close()

	provider := &ResendProvider{
		apiKey:    "re_test",
		fromEmail: "Lumen <lumen@example.com>",
		baseURL:   srv.URL,
		client:    srv.Client(),
	}

	link := "https://example.com/login?token=abc"
	err := provider.SendMagicLink(context.Background(), "person@example.com", link)
	if err != nil {
		t.Fatalf("SendMagicLink error: %v", err)
	}

	if gotAuth != "Bearer re_test" {
		t.Fatalf("expected auth header Bearer re_test, got %q", gotAuth)
	}
	if gotPayload.From != "Lumen <lumen@example.com>" {
		t.Fatalf("expected From to be set, got %q", gotPayload.From)
	}
	if len(gotPayload.To) != 1 || gotPayload.To[0] != "person@example.com" {
		t.Fatalf("expected To to include recipient, got %#v", gotPayload.To)
	}
	if gotPayload.Subject == "" {
		t.Fatalf("expected Subject to be set")
	}
	if !strings.Contains(gotPayload.HTML, link) {
		t.Fatalf("expected HTML to include the magic link")
	}
}

func TestResendProviderReturnsErrorOnFailure(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"bad_request"}`))
	}))
	defer srv.Close()

	provider := &ResendProvider{
		apiKey:    "re_test",
		fromEmail: "Lumen <lumen@example.com>",
		baseURL:   srv.URL,
		client:    srv.Client(),
	}

	err := provider.SendMagicLink(context.Background(), "person@example.com", "https://example.com")
	if err == nil {
		t.Fatalf("expected SendMagicLink to return an error")
	}
}
