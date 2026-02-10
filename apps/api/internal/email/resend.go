package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/url"
)

const resendAPIURL = "https://api.resend.com/emails"

// ResendProvider delivers emails via the Resend HTTP API.
type ResendProvider struct {
	apiKey    string
	fromEmail string
	baseURL   string
	client    *http.Client
}

// NewResendProvider constructs a Resend email provider.
func NewResendProvider(apiKey, fromEmail string) *ResendProvider {
	return &ResendProvider{
		apiKey:    apiKey,
		fromEmail: fromEmail,
		baseURL:   resendAPIURL,
		client:    http.DefaultClient,
	}
}

type resendPayload struct {
	From    string `json:"from"`
	To      []string `json:"to"`
	Subject string `json:"subject"`
	HTML    string `json:"html"`
}

// SendMagicLink delivers a magic link email via Resend.
func (p *ResendProvider) SendMagicLink(ctx context.Context, email, link string) error {
	htmlBody := buildMagicLinkHTML(link)

	payload := resendPayload{
		From:    p.fromEmail,
		To:      []string{email},
		Subject: "Sign in to Lumen",
		HTML:    htmlBody,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("resend marshal: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, resendAPIURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("resend request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.apiKey)

	client := p.client
	if client == nil {
		client = http.DefaultClient
	}
	baseURL := p.baseURL
	if baseURL == "" {
		baseURL = resendAPIURL
	}
	parsedURL, err := url.Parse(baseURL)
	if err != nil {
		return fmt.Errorf("resend url: %w", err)
	}
	req.URL = parsedURL
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("resend send: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("resend error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}

func buildMagicLinkHTML(link string) string {
	safeLink := html.EscapeString(link)
	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#faf9f7;font-family:'Lato',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf9f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;padding:48px 40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <h1 style="margin:0;font-size:28px;color:#2d2926;font-weight:600;">Lumen</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <p style="margin:0;font-size:16px;color:#5a524b;line-height:1.6;">
                Click the button below to sign in. This link expires in 15 minutes.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <a href="` + safeLink + `" style="display:inline-block;background-color:#5b8a72;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;">
                Sign in to Lumen
              </a>
            </td>
          </tr>
          <tr>
            <td style="text-align:center;">
              <p style="margin:0;font-size:13px;color:#9a918a;line-height:1.5;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
