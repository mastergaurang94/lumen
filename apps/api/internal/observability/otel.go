package observability

import (
	"context"
	"net/http"
	"os"
	"strconv"
	"strings"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
	"go.opentelemetry.io/otel/trace/noop"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/mastergaurang94/lumen/apps/api/internal/config"
)

const serviceName = "lumen-api"

// InitTracing configures OpenTelemetry tracing when an exporter endpoint is provided.
func InitTracing(cfg config.Config) (func(context.Context) error, error) {
	endpoint := strings.TrimSpace(os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT"))
	if endpoint == "" {
		otel.SetTracerProvider(noop.NewTracerProvider())
		return func(context.Context) error { return nil }, nil
	}

	opts := []otlptracehttp.Option{otlptracehttp.WithEndpoint(endpoint)}
	if strings.EqualFold(os.Getenv("OTEL_EXPORTER_OTLP_INSECURE"), "true") {
		opts = append(opts, otlptracehttp.WithInsecure())
	}

	exporter, err := otlptracehttp.New(context.Background(), opts...)
	if err != nil {
		return nil, err
	}

	res, err := resource.New(
		context.Background(),
		resource.WithAttributes(
			semconv.ServiceName(serviceName),
			attribute.String("env", cfg.Env),
		),
	)
	if err != nil {
		return nil, err
	}

	tracerProvider := sdktrace.NewTracerProvider(
		sdktrace.WithSampler(buildSampler()),
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
	)

	otel.SetTracerProvider(tracerProvider)
	return tracerProvider.Shutdown, nil
}

// TraceRequests starts a span for each incoming HTTP request.
func TraceRequests() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
			tracer := otel.Tracer("lumen-api/http")
			ctx, span := tracer.Start(r.Context(), r.Method+" "+r.URL.Path)
			defer span.End()

			span.SetAttributes(
				attribute.String("http.method", r.Method),
				attribute.String("http.route", r.URL.Path),
			)

			next.ServeHTTP(ww, r.WithContext(ctx))

			span.SetAttributes(attribute.Int("http.status_code", ww.Status()))
		})
	}
}

func buildSampler() sdktrace.Sampler {
	sampler := strings.ToLower(strings.TrimSpace(os.Getenv("OTEL_TRACES_SAMPLER")))
	switch sampler {
	case "always_on":
		return sdktrace.ParentBased(sdktrace.AlwaysSample())
	case "always_off":
		return sdktrace.ParentBased(sdktrace.NeverSample())
	case "traceidratio":
		ratio := parseRatio(os.Getenv("OTEL_TRACES_SAMPLER_ARG"), 0.1)
		return sdktrace.ParentBased(sdktrace.TraceIDRatioBased(ratio))
	default:
		return sdktrace.ParentBased(sdktrace.TraceIDRatioBased(0.1))
	}
}

func parseRatio(raw string, fallback float64) float64 {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return fallback
	}
	if value, err := strconv.ParseFloat(trimmed, 64); err == nil && value >= 0 && value <= 1 {
		return value
	}
	return fallback
}
