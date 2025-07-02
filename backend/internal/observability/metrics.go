package observability

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// MetricsService manages Prometheus metrics collection
type MetricsService struct {
	// HTTP Metrics
	httpRequests      *prometheus.CounterVec
	httpDuration      *prometheus.HistogramVec
	httpRequestSize   *prometheus.HistogramVec
	httpResponseSize  *prometheus.HistogramVec
	activeConnections prometheus.Gauge

	// Database Metrics
	dbConnections   *prometheus.GaugeVec
	dbQueries       *prometheus.CounterVec
	dbQueryDuration *prometheus.HistogramVec
	dbConnPoolStats *prometheus.GaugeVec

	// Cache Metrics
	cacheOperations *prometheus.CounterVec
	cacheDuration   *prometheus.HistogramVec
	cacheHitRate    prometheus.Gauge
	cacheSize       prometheus.Gauge

	// Business Metrics
	helpRequests         *prometheus.CounterVec
	volunteerActivity    *prometheus.CounterVec
	donations            *prometheus.CounterVec
	queueMetrics         *prometheus.GaugeVec
	websocketConnections *prometheus.GaugeVec

	// System Metrics
	systemHealth *prometheus.GaugeVec
	errorRate    *prometheus.CounterVec
	memoryUsage  prometheus.Gauge
	goroutines   prometheus.Gauge

	registry *prometheus.Registry
}

var globalMetricsService *MetricsService

// NewMetricsService creates a new metrics service
func NewMetricsService() *MetricsService {
	registry := prometheus.NewRegistry()

	ms := &MetricsService{
		registry: registry,
	}

	ms.initializeMetrics()
	ms.registerMetrics()

	globalMetricsService = ms
	log.Println("Prometheus metrics service initialized")

	return ms
}

// initializeMetrics creates all Prometheus metrics
func (ms *MetricsService) initializeMetrics() {
	// HTTP Metrics
	ms.httpRequests = promauto.With(ms.registry).NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "route", "status_code", "user_role"},
	)

	ms.httpDuration = promauto.With(ms.registry).NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "route", "status_code"},
	)

	ms.httpRequestSize = promauto.With(ms.registry).NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_size_bytes",
			Help:    "HTTP request size in bytes",
			Buckets: prometheus.ExponentialBuckets(256, 2, 10),
		},
		[]string{"method", "route"},
	)

	ms.httpResponseSize = promauto.With(ms.registry).NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_response_size_bytes",
			Help:    "HTTP response size in bytes",
			Buckets: prometheus.ExponentialBuckets(256, 2, 10),
		},
		[]string{"method", "route", "status_code"},
	)

	ms.activeConnections = promauto.With(ms.registry).NewGauge(
		prometheus.GaugeOpts{
			Name: "http_active_connections",
			Help: "Number of active HTTP connections",
		},
	)

	// Database Metrics
	ms.dbConnections = promauto.With(ms.registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "database_connections",
			Help: "Number of database connections",
		},
		[]string{"state"}, // open, idle, in_use
	)

	ms.dbQueries = promauto.With(ms.registry).NewCounterVec(
		prometheus.CounterOpts{
			Name: "database_queries_total",
			Help: "Total number of database queries",
		},
		[]string{"operation", "table", "status"},
	)

	ms.dbQueryDuration = promauto.With(ms.registry).NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "database_query_duration_seconds",
			Help:    "Database query duration in seconds",
			Buckets: []float64{0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0},
		},
		[]string{"operation", "table"},
	)

	ms.dbConnPoolStats = promauto.With(ms.registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "database_connection_pool",
			Help: "Database connection pool statistics",
		},
		[]string{"metric"}, // max_open, open, in_use, idle
	)

	// Cache Metrics
	ms.cacheOperations = promauto.With(ms.registry).NewCounterVec(
		prometheus.CounterOpts{
			Name: "cache_operations_total",
			Help: "Total number of cache operations",
		},
		[]string{"operation", "status"}, // get/set/delete, hit/miss/error
	)

	ms.cacheDuration = promauto.With(ms.registry).NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "cache_operation_duration_seconds",
			Help:    "Cache operation duration in seconds",
			Buckets: []float64{0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1},
		},
		[]string{"operation"},
	)

	ms.cacheHitRate = promauto.With(ms.registry).NewGauge(
		prometheus.GaugeOpts{
			Name: "cache_hit_rate",
			Help: "Cache hit rate percentage",
		},
	)

	ms.cacheSize = promauto.With(ms.registry).NewGauge(
		prometheus.GaugeOpts{
			Name: "cache_size_bytes",
			Help: "Cache size in bytes",
		},
	)

	// Business Metrics
	ms.helpRequests = promauto.With(ms.registry).NewCounterVec(
		prometheus.CounterOpts{
			Name: "help_requests_total",
			Help: "Total number of help requests",
		},
		[]string{"category", "priority", "status"},
	)

	ms.volunteerActivity = promauto.With(ms.registry).NewCounterVec(
		prometheus.CounterOpts{
			Name: "volunteer_activity_total",
			Help: "Total volunteer activities",
		},
		[]string{"activity_type", "volunteer_role"},
	)

	ms.donations = promauto.With(ms.registry).NewCounterVec(
		prometheus.CounterOpts{
			Name: "donations_total",
			Help: "Total number of donations",
		},
		[]string{"type", "status"},
	)

	ms.queueMetrics = promauto.With(ms.registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "queue_metrics",
			Help: "Queue management metrics",
		},
		[]string{"category", "metric"}, // food/general, length/wait_time/processing_time
	)

	ms.websocketConnections = promauto.With(ms.registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "websocket_connections",
			Help: "Number of active WebSocket connections",
		},
		[]string{"user_role", "category"},
	)

	// System Metrics
	ms.systemHealth = promauto.With(ms.registry).NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "system_health",
			Help: "System health status (1 = healthy, 0 = unhealthy)",
		},
		[]string{"component"}, // database, redis, websocket, etc.
	)

	ms.errorRate = promauto.With(ms.registry).NewCounterVec(
		prometheus.CounterOpts{
			Name: "errors_total",
			Help: "Total number of errors",
		},
		[]string{"type", "component", "severity"},
	)

	ms.memoryUsage = promauto.With(ms.registry).NewGauge(
		prometheus.GaugeOpts{
			Name: "memory_usage_bytes",
			Help: "Memory usage in bytes",
		},
	)

	ms.goroutines = promauto.With(ms.registry).NewGauge(
		prometheus.GaugeOpts{
			Name: "goroutines_total",
			Help: "Number of goroutines",
		},
	)
}

// registerMetrics registers metrics with the registry
func (ms *MetricsService) registerMetrics() {
	// All metrics are automatically registered via promauto.With(registry)
	log.Println("All metrics registered with Prometheus registry")
}

// GetMetricsService returns the global metrics service
func GetMetricsService() *MetricsService {
	if globalMetricsService == nil {
		globalMetricsService = NewMetricsService()
	}
	return globalMetricsService
}

// GetHandler returns the Prometheus metrics HTTP handler
func (ms *MetricsService) GetHandler() http.Handler {
	return promhttp.HandlerFor(ms.registry, promhttp.HandlerOpts{
		EnableOpenMetrics: true,
	})
}

// HTTP Metrics Methods
func (ms *MetricsService) RecordHTTPRequest(method, route, statusCode, userRole string, duration time.Duration, requestSize, responseSize int) {
	ms.httpRequests.WithLabelValues(method, route, statusCode, userRole).Inc()
	ms.httpDuration.WithLabelValues(method, route, statusCode).Observe(duration.Seconds())
	ms.httpRequestSize.WithLabelValues(method, route).Observe(float64(requestSize))
	ms.httpResponseSize.WithLabelValues(method, route, statusCode).Observe(float64(responseSize))
}

func (ms *MetricsService) SetActiveConnections(count int) {
	ms.activeConnections.Set(float64(count))
}

// Database Metrics Methods
func (ms *MetricsService) RecordDatabaseQuery(operation, table, status string, duration time.Duration) {
	ms.dbQueries.WithLabelValues(operation, table, status).Inc()
	ms.dbQueryDuration.WithLabelValues(operation, table).Observe(duration.Seconds())
}

func (ms *MetricsService) SetDatabaseConnections(open, idle, inUse int) {
	ms.dbConnections.WithLabelValues("open").Set(float64(open))
	ms.dbConnections.WithLabelValues("idle").Set(float64(idle))
	ms.dbConnections.WithLabelValues("in_use").Set(float64(inUse))
}

func (ms *MetricsService) SetDatabaseConnectionPoolStats(maxOpen, open, inUse, idle int) {
	ms.dbConnPoolStats.WithLabelValues("max_open").Set(float64(maxOpen))
	ms.dbConnPoolStats.WithLabelValues("open").Set(float64(open))
	ms.dbConnPoolStats.WithLabelValues("in_use").Set(float64(inUse))
	ms.dbConnPoolStats.WithLabelValues("idle").Set(float64(idle))
}

// Cache Metrics Methods
func (ms *MetricsService) RecordCacheOperation(operation, status string, duration time.Duration) {
	ms.cacheOperations.WithLabelValues(operation, status).Inc()
	ms.cacheDuration.WithLabelValues(operation).Observe(duration.Seconds())
}

func (ms *MetricsService) SetCacheHitRate(rate float64) {
	ms.cacheHitRate.Set(rate)
}

func (ms *MetricsService) SetCacheSize(size int64) {
	ms.cacheSize.Set(float64(size))
}

// Business Metrics Methods
func (ms *MetricsService) RecordHelpRequest(category, priority, status string) {
	ms.helpRequests.WithLabelValues(category, priority, status).Inc()
}

func (ms *MetricsService) RecordVolunteerActivity(activityType, volunteerRole string) {
	ms.volunteerActivity.WithLabelValues(activityType, volunteerRole).Inc()
}

func (ms *MetricsService) RecordDonation(donationType, status string) {
	ms.donations.WithLabelValues(donationType, status).Inc()
}

func (ms *MetricsService) SetQueueMetrics(category, metric string, value float64) {
	ms.queueMetrics.WithLabelValues(category, metric).Set(value)
}

func (ms *MetricsService) SetWebSocketConnections(userRole, category string, count int) {
	ms.websocketConnections.WithLabelValues(userRole, category).Set(float64(count))
}

// System Metrics Methods
func (ms *MetricsService) SetSystemHealth(component string, healthy bool) {
	value := float64(0)
	if healthy {
		value = 1
	}
	ms.systemHealth.WithLabelValues(component).Set(value)
}

func (ms *MetricsService) RecordError(errorType, component, severity string) {
	ms.errorRate.WithLabelValues(errorType, component, severity).Inc()
}

func (ms *MetricsService) SetMemoryUsage(bytes int64) {
	ms.memoryUsage.Set(float64(bytes))
}

func (ms *MetricsService) SetGoroutines(count int) {
	ms.goroutines.Set(float64(count))
}

// Middleware function for Gin
func MetricsMiddleware() gin.HandlerFunc {
	ms := GetMetricsService()

	return func(c *gin.Context) {
		start := time.Now()

		// Increment active connections
		ms.activeConnections.Inc()
		defer ms.activeConnections.Dec()

		// Process request
		c.Next()

		// Record metrics
		duration := time.Since(start)
		statusCode := strconv.Itoa(c.Writer.Status())
		userRole := getUserRole(c)

		ms.RecordHTTPRequest(
			c.Request.Method,
			c.FullPath(),
			statusCode,
			userRole,
			duration,
			int(c.Request.ContentLength),
			c.Writer.Size(),
		)

		// Record errors if any
		if len(c.Errors) > 0 {
			for range c.Errors {
				ms.RecordError("http_error", "gin", getSeverity(c.Writer.Status()))
			}
		}
	}
}

// Helper functions
func getUserRole(c *gin.Context) string {
	if role, exists := c.Get("userRole"); exists {
		return role.(string)
	}
	return "anonymous"
}

func getSeverity(statusCode int) string {
	switch {
	case statusCode >= 500:
		return "error"
	case statusCode >= 400:
		return "warning"
	default:
		return "info"
	}
}
