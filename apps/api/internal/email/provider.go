package email

import (
	"context"
	"log"
)

// Provider delivers transactional emails (magic links, notifications).
type Provider interface {
	SendMagicLink(ctx context.Context, email, link string) error
}

// DevProvider logs magic links instead of sending real emails.
type DevProvider struct{}

// SendMagicLink logs the link for local development.
func (p *DevProvider) SendMagicLink(_ context.Context, email, link string) error {
	log.Printf("magic link issued for %s (link omitted from logs)", redactEmail(email))
	log.Printf("magic link (dev): %s", link)
	return nil
}

func redactEmail(email string) string {
	if len(email) < 3 {
		return "***"
	}
	return email[:1] + "***" + email[len(email)-1:]
}
