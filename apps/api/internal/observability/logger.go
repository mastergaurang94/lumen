package observability

import (
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

// RequestLogger emits structured logs without PII for each request.
func RequestLogger() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

			next.ServeHTTP(ww, r)

			duration := time.Since(start)
			requestID := middleware.GetReqID(r.Context())
			log.Printf(
				"request_id=%s method=%s path=%s status=%d latency_ms=%d",
				requestID,
				r.Method,
				r.URL.Path,
				ww.Status(),
				duration.Milliseconds(),
			)
		})
	}
}
