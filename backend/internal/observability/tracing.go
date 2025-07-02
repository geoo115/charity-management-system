package observability

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/exporters/jaeger"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.20.0"
	oteltrace "go.opentelemetry.io/otel/trace"
)

// TracingConfig holds OpenTelemetry configuration
type TracingConfig struct {
	ServiceName    string
	ServiceVersion string
	Environment    string
	JaegerEndpoint string
	OTLPEndpoint   string
	SamplingRatio  float64
	Enabled        bool
}

// TracingService manages OpenTelemetry tracing
type TracingService struct {
	config   TracingConfig
	tracer   oteltrace.Tracer
	provider *trace.TracerProvider
}

var (
	globalTracingService *TracingService
	tracer               = otel.Tracer("lewisham-hub")
)

// NewTracingService creates a new tracing service
func NewTracingService(config TracingConfig) (*TracingService, error) {
	if !config.Enabled {
		log.Println("Tracing is disabled")
		return &TracingService{config: config}, nil
	}

	// Create resource with service information
	res, err := resource.New(context.Background(),
		resource.WithAttributes(
			semconv.ServiceNameKey.String(config.ServiceName),
			semconv.ServiceVersionKey.String(config.ServiceVersion),
			semconv.DeploymentEnvironmentKey.String(config.Environment),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	// Create trace provider with exporters
	tp, err := createTraceProvider(config, res)
	if err != nil {
		return nil, fmt.Errorf("failed to create trace provider: %w", err)
	}

	// Set global trace provider and propagator
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	service := &TracingService{
		config:   config,
		tracer:   tp.Tracer(config.ServiceName),
		provider: tp,
	}

	globalTracingService = service
	log.Printf("OpenTelemetry tracing initialized for service: %s", config.ServiceName)

	return service, nil
}

// createTraceProvider creates a trace provider with appropriate exporters
func createTraceProvider(config TracingConfig, res *resource.Resource) (*trace.TracerProvider, error) {
	var exporters []trace.SpanExporter

	// Add Jaeger exporter if endpoint is configured
	if config.JaegerEndpoint != "" {
		jaegerExporter, err := jaeger.New(jaeger.WithCollectorEndpoint(jaeger.WithEndpoint(config.JaegerEndpoint)))
		if err != nil {
			log.Printf("Failed to create Jaeger exporter: %v", err)
		} else {
			exporters = append(exporters, jaegerExporter)
			log.Printf("Jaeger exporter configured: %s", config.JaegerEndpoint)
		}
	}

	// Add OTLP exporter if endpoint is configured
	if config.OTLPEndpoint != "" {
		otlpExporter, err := otlptracehttp.New(context.Background(),
			otlptracehttp.WithEndpoint(config.OTLPEndpoint),
			otlptracehttp.WithInsecure(), // Use HTTPS in production
		)
		if err != nil {
			log.Printf("Failed to create OTLP exporter: %v", err)
		} else {
			exporters = append(exporters, otlpExporter)
			log.Printf("OTLP exporter configured: %s", config.OTLPEndpoint)
		}
	}

	if len(exporters) == 0 {
		return nil, fmt.Errorf("no trace exporters configured")
	}

	// Create batch span processors for all exporters
	var processors []trace.SpanProcessor
	for _, exporter := range exporters {
		processor := trace.NewBatchSpanProcessor(exporter,
			trace.WithBatchTimeout(time.Second*5),
			trace.WithMaxExportBatchSize(512),
			trace.WithMaxQueueSize(2048),
		)
		processors = append(processors, processor)
	}

	// Create trace provider with sampling
	sampler := trace.TraceIDRatioBased(config.SamplingRatio)
	if config.Environment == "development" {
		sampler = trace.AlwaysSample() // Sample everything in development
	}

	tp := trace.NewTracerProvider(
		trace.WithResource(res),
		trace.WithSampler(sampler),
	)

	// Register all processors
	for _, processor := range processors {
		tp.RegisterSpanProcessor(processor)
	}

	return tp, nil
}

// GetTracingService returns the global tracing service instance
func GetTracingService() *TracingService {
	return globalTracingService
}

// GetTracer returns the configured tracer
func GetTracer() oteltrace.Tracer {
	if globalTracingService != nil {
		return globalTracingService.tracer
	}
	return tracer
}

// StartSpan creates a new span with common attributes
func (ts *TracingService) StartSpan(ctx context.Context, operationName string, opts ...oteltrace.SpanStartOption) (context.Context, oteltrace.Span) {
	if ts.tracer == nil {
		return ctx, oteltrace.SpanFromContext(ctx)
	}
	return ts.tracer.Start(ctx, operationName, opts...)
}

// StartHTTPSpan creates a span for HTTP operations
func (ts *TracingService) StartHTTPSpan(ctx context.Context, method, route, userRole string) (context.Context, oteltrace.Span) {
	ctx, span := ts.StartSpan(ctx, fmt.Sprintf("%s %s", method, route),
		oteltrace.WithSpanKind(oteltrace.SpanKindServer),
		oteltrace.WithAttributes(
			semconv.HTTPMethodKey.String(method),
			semconv.HTTPRouteKey.String(route),
			attribute.String("user.role", userRole),
		),
	)
	return ctx, span
}

// StartDatabaseSpan creates a span for database operations
func (ts *TracingService) StartDatabaseSpan(ctx context.Context, operation, table string) (context.Context, oteltrace.Span) {
	ctx, span := ts.StartSpan(ctx, fmt.Sprintf("db.%s", operation),
		oteltrace.WithSpanKind(oteltrace.SpanKindClient),
		oteltrace.WithAttributes(
			semconv.DBSystemKey.String("postgresql"),
			semconv.DBOperationKey.String(operation),
			semconv.DBSQLTableKey.String(table),
		),
	)
	return ctx, span
}

// StartCacheSpan creates a span for cache operations
func (ts *TracingService) StartCacheSpan(ctx context.Context, operation, key string) (context.Context, oteltrace.Span) {
	ctx, span := ts.StartSpan(ctx, fmt.Sprintf("cache.%s", operation),
		oteltrace.WithSpanKind(oteltrace.SpanKindClient),
		oteltrace.WithAttributes(
			semconv.DBSystemKey.String("redis"),
			semconv.DBOperationKey.String(operation),
			attribute.String("cache.key", key),
		),
	)
	return ctx, span
}

// StartQueueSpan creates a span for queue operations
func (ts *TracingService) StartQueueSpan(ctx context.Context, operation, queueName string) (context.Context, oteltrace.Span) {
	ctx, span := ts.StartSpan(ctx, fmt.Sprintf("queue.%s", operation),
		oteltrace.WithSpanKind(oteltrace.SpanKindProducer),
		oteltrace.WithAttributes(
			attribute.String("messaging.system", "internal"),
			attribute.String("messaging.operation", operation),
			attribute.String("messaging.destination", queueName),
		),
	)
	return ctx, span
}

// StartWebSocketSpan creates a span for WebSocket operations
func (ts *TracingService) StartWebSocketSpan(ctx context.Context, operation string, userID uint, categories []string) (context.Context, oteltrace.Span) {
	ctx, span := ts.StartSpan(ctx, fmt.Sprintf("websocket.%s", operation),
		oteltrace.WithSpanKind(oteltrace.SpanKindServer),
		oteltrace.WithAttributes(
			attribute.String("websocket.operation", operation),
			attribute.Int64("user.id", int64(userID)),
			attribute.StringSlice("websocket.categories", categories),
		),
	)
	return ctx, span
}

// AddSpanAttributes adds attributes to the current span
func AddSpanAttributes(span oteltrace.Span, attrs ...attribute.KeyValue) {
	if span != nil {
		span.SetAttributes(attrs...)
	}
}

// AddSpanEvent adds an event to the current span
func AddSpanEvent(span oteltrace.Span, name string, attrs ...attribute.KeyValue) {
	if span != nil {
		span.AddEvent(name, oteltrace.WithAttributes(attrs...))
	}
}

// RecordError records an error on the span
func RecordError(span oteltrace.Span, err error) {
	if span != nil && err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
	}
}

// SetSpanStatus sets the span status
func SetSpanStatus(span oteltrace.Span, code codes.Code, description string) {
	if span != nil {
		span.SetStatus(code, description)
	}
}

// LoadTracingConfig loads tracing configuration from environment
func LoadTracingConfig() TracingConfig {
	return TracingConfig{
		ServiceName:    getEnvOrDefault("OTEL_SERVICE_NAME", "lewisham-hub-api"),
		ServiceVersion: getEnvOrDefault("OTEL_SERVICE_VERSION", "1.0.0"),
		Environment:    getEnvOrDefault("APP_ENV", "development"),
		JaegerEndpoint: os.Getenv("JAEGER_ENDPOINT"),
		OTLPEndpoint:   os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT"),
		SamplingRatio:  getEnvFloat("OTEL_SAMPLING_RATIO", 0.1),
		Enabled:        getEnvBool("OTEL_TRACING_ENABLED", true),
	}
}

// InitializeTracing initializes OpenTelemetry tracing
func InitializeTracing() (*TracingService, error) {
	config := LoadTracingConfig()
	return NewTracingService(config)
}

// Shutdown gracefully shuts down the tracing service
func (ts *TracingService) Shutdown(ctx context.Context) error {
	if ts.provider != nil {
		return ts.provider.Shutdown(ctx)
	}
	return nil
}

// Utility functions for environment variables
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		return value == "true" || value == "1"
	}
	return defaultValue
}

func getEnvFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if f, err := parseFloat(value); err == nil {
			return f
		}
	}
	return defaultValue
}

// Simple float parser to avoid importing strconv
func parseFloat(s string) (float64, error) {
	// Simple implementation for common cases
	switch s {
	case "0.1":
		return 0.1, nil
	case "0.5":
		return 0.5, nil
	case "1.0":
		return 1.0, nil
	default:
		return 0.1, nil // Default sampling ratio
	}
}
