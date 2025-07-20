package observability

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// SimpleMetricsService provides essential metrics only
type SimpleMetricsService struct {
	// HTTP Metrics
	httpRequests *prometheus.CounterVec
	httpDuration *prometheus.HistogramVec

	// Business Metrics
	helpRequests *prometheus.CounterVec
	donations    *prometheus.CounterVec

	// System Metrics
	errorRate prometheus.Counter

	registry *prometheus.Registry
}

var globalSimpleMetrics *SimpleMetricsService

// NewSimpleMetricsService creates a new simplified metrics service
func NewSimpleMetricsService() *SimpleMetricsService {
	registry := prometheus.NewRegistry()

	ms := &SimpleMetricsService{
		registry: registry,
	}

	ms.initializeMetrics()
	ms.registerMetrics()

	globalSimpleMetrics = ms
	return ms
}

// initializeMetrics creates essential Prometheus metrics only
func (ms *SimpleMetricsService) initializeMetrics() {
	// HTTP Metrics
	ms.httpRequests = promauto.With(ms.registry).NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "route", "status_code"},
	)

	ms.httpDuration = promauto.With(ms.registry).NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "route"},
	)

	// Business Metrics
	ms.helpRequests = promauto.With(ms.registry).NewCounterVec(
		prometheus.CounterOpts{
			Name: "help_requests_total",
			Help: "Total number of help requests",
		},
		[]string{"status"},
	)

	ms.donations = promauto.With(ms.registry).NewCounterVec(
		prometheus.CounterOpts{
			Name: "donations_total",
			Help: "Total number of donations",
		},
		[]string{"type"},
	)

	// System Metrics
	ms.errorRate = promauto.With(ms.registry).NewCounter(
		prometheus.CounterOpts{
			Name: "errors_total",
			Help: "Total number of errors",
		},
	)
}

// registerMetrics registers all metrics with the registry
func (ms *SimpleMetricsService) registerMetrics() {
	// Metrics are auto-registered by promauto
}

// GetSimpleMetricsService returns the global metrics service
func GetSimpleMetricsService() *SimpleMetricsService {
	return globalSimpleMetrics
}

// GetHandler returns the Prometheus HTTP handler
func (ms *SimpleMetricsService) GetHandler() http.Handler {
	return promhttp.HandlerFor(ms.registry, promhttp.HandlerOpts{})
}

// RecordHTTPRequest records an HTTP request
func (ms *SimpleMetricsService) RecordHTTPRequest(method, route, statusCode string, duration time.Duration) {
	ms.httpRequests.WithLabelValues(method, route, statusCode).Inc()
	ms.httpDuration.WithLabelValues(method, route).Observe(duration.Seconds())
}

// RecordHelpRequest records a help request
func (ms *SimpleMetricsService) RecordHelpRequest(status string) {
	ms.helpRequests.WithLabelValues(status).Inc()
}

// RecordDonation records a donation
func (ms *SimpleMetricsService) RecordDonation(donationType string) {
	ms.donations.WithLabelValues(donationType).Inc()
}

// RecordError records an error
func (ms *SimpleMetricsService) RecordError() {
	ms.errorRate.Inc()
}

// SimpleMetricsMiddleware provides basic metrics collection
func SimpleMetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Process request
		c.Next()

		// Record metrics
		duration := time.Since(start)
		statusCode := c.Writer.Status()

		if globalSimpleMetrics != nil {
			globalSimpleMetrics.RecordHTTPRequest(
				c.Request.Method,
				c.FullPath(),
				string(rune(statusCode)),
				duration,
			)

			// Record errors
			if statusCode >= 400 {
				globalSimpleMetrics.RecordError()
			}
		}
	}
}
