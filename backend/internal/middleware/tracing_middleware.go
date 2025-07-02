package middleware

import (
	"context"
	"time"

	"github.com/geoo115/charity-management-system/internal/observability"
	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/propagation"
	semconv "go.opentelemetry.io/otel/semconv/v1.20.0"
	"go.opentelemetry.io/otel/trace"
)

// TracingMiddleware creates middleware for OpenTelemetry distributed tracing
func TracingMiddleware() gin.HandlerFunc {
	tracer := otel.Tracer("lewisham-hub-http")
	propagator := otel.GetTextMapPropagator()

	return func(c *gin.Context) {
		// Extract tracing context from incoming request headers
		ctx := propagator.Extract(c.Request.Context(), propagation.HeaderCarrier(c.Request.Header))

		// Create span for the HTTP request
		spanName := c.Request.Method + " " + c.FullPath()
		if c.FullPath() == "" {
			spanName = c.Request.Method + " " + c.Request.URL.Path
		}

		ctx, span := tracer.Start(ctx, spanName,
			trace.WithSpanKind(trace.SpanKindServer),
			trace.WithAttributes(
				semconv.HTTPMethodKey.String(c.Request.Method),
				semconv.HTTPTargetKey.String(c.Request.URL.Path),
				semconv.HTTPSchemeKey.String(c.Request.URL.Scheme),
				attribute.String("http.host", c.Request.Host),
				attribute.String("http.user_agent", c.Request.UserAgent()),
				semconv.HTTPRouteKey.String(c.FullPath()),
				attribute.String("http.client_ip", c.ClientIP()),
			),
		)
		defer span.End()

		// Store span in context for use in handlers
		c.Request = c.Request.WithContext(ctx)
		c.Set("trace_span", span)
		c.Set("trace_context", ctx)

		// Record start time
		start := time.Now()

		// Process request
		c.Next()

		// Add response attributes
		duration := time.Since(start)
		span.SetAttributes(
			semconv.HTTPStatusCodeKey.Int(c.Writer.Status()),
			attribute.Int("http.response_size", c.Writer.Size()),
			attribute.Int64("http.duration_ms", duration.Milliseconds()),
		)

		// Add user information if available
		if userID, exists := c.Get("userID"); exists {
			span.SetAttributes(attribute.Int64("user.id", int64(userID.(int))))
		}
		if userRole, exists := c.Get("userRole"); exists {
			span.SetAttributes(attribute.String("user.role", userRole.(string)))
		}
		if userEmail, exists := c.Get("userEmail"); exists {
			span.SetAttributes(attribute.String("user.email", userEmail.(string)))
		}

		// Set span status based on HTTP status code
		statusCode := c.Writer.Status()
		if statusCode >= 400 {
			span.SetStatus(codes.Error, "HTTP "+string(rune(statusCode)))
		} else {
			span.SetStatus(codes.Ok, "")
		}

		// Add error information if present
		if len(c.Errors) > 0 {
			for _, err := range c.Errors {
				span.RecordError(err.Err)
				span.AddEvent("error", trace.WithAttributes(
					attribute.String("error.message", err.Error()),
					attribute.String("error.type", string(err.Type)),
				))
			}
		}
	}
}

// GetSpanFromContext retrieves the current span from Gin context
func GetSpanFromContext(c *gin.Context) trace.Span {
	if span, exists := c.Get("trace_span"); exists {
		return span.(trace.Span)
	}
	return trace.SpanFromContext(c.Request.Context())
}

// GetTraceContextFromContext retrieves the trace context from Gin context
func GetTraceContextFromContext(c *gin.Context) context.Context {
	if ctx, exists := c.Get("trace_context"); exists {
		return ctx.(context.Context)
	}
	return c.Request.Context()
}

// AddSpanAttributes adds attributes to the current request's span
func AddSpanAttributes(c *gin.Context, attrs ...attribute.KeyValue) {
	if span := GetSpanFromContext(c); span != nil {
		span.SetAttributes(attrs...)
	}
}

// AddSpanEvent adds an event to the current request's span
func AddSpanEvent(c *gin.Context, name string, attrs ...attribute.KeyValue) {
	if span := GetSpanFromContext(c); span != nil {
		span.AddEvent(name, trace.WithAttributes(attrs...))
	}
}

// RecordSpanError records an error on the current request's span
func RecordSpanError(c *gin.Context, err error) {
	if span := GetSpanFromContext(c); span != nil && err != nil {
		span.RecordError(err)
		observability.RecordError(span, err)
	}
}

// StartChildSpan starts a child span from the current request context
func StartChildSpan(c *gin.Context, operationName string, opts ...trace.SpanStartOption) (context.Context, trace.Span) {
	ctx := GetTraceContextFromContext(c)
	tracer := otel.Tracer("lewisham-hub")
	return tracer.Start(ctx, operationName, opts...)
}

// DatabaseTracingMiddleware wraps database operations with tracing
func DatabaseTracingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Add database tracing context to the request
		if ts := observability.GetTracingService(); ts != nil {
			c.Set("tracing_service", ts)
		}
		c.Next()
	}
}
