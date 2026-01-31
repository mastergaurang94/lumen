package middleware

import (
	"net/http"

	chimiddleware "github.com/go-chi/chi/v5/middleware"
)

// RequestID attaches or generates a request ID and echoes it in the response headers.
func RequestID() func(http.Handler) http.Handler {
	return chimiddleware.RequestID
}
