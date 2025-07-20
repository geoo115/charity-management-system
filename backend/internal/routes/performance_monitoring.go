package routes

import (
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// PerformanceMetrics holds performance data for a route
type PerformanceMetrics struct {
	Path            string        `json:"path"`
	Method          string        `json:"method"`
	Count           int64         `json:"count"`
	TotalDuration   time.Duration `json:"total_duration"`
	AverageDuration time.Duration `json:"average_duration"`
	MinDuration     time.Duration `json:"min_duration"`
	MaxDuration     time.Duration `json:"max_duration"`
	ErrorCount      int64         `json:"error_count"`
	ErrorRate       float64       `json:"error_rate"`
	LastAccessed    time.Time     `json:"last_accessed"`
}

// PerformanceMonitor tracks route performance metrics
type PerformanceMonitor struct {
	metrics       map[string]*PerformanceMetrics
	mutex         sync.RWMutex
	slowThreshold time.Duration
	enableLogging bool
	enableAlerts  bool
	logger        *log.Logger
}

// NewPerformanceMonitor creates a new performance monitor
func NewPerformanceMonitor(slowThreshold time.Duration, enableLogging, enableAlerts bool) *PerformanceMonitor {
	return &PerformanceMonitor{
		metrics:       make(map[string]*PerformanceMetrics),
		slowThreshold: slowThreshold,
		enableLogging: enableLogging,
		enableAlerts:  enableAlerts,
		logger:        log.New(log.Writer(), "[PERF] ", log.LstdFlags),
	}
}

// PerformanceMiddleware provides performance monitoring for routes
func (pm *PerformanceMonitor) PerformanceMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Add performance monitor to context
		c.Set("performance_monitor", pm)
		c.Set("request_start", start)

		// Process request
		c.Next()

		// Calculate metrics
		duration := time.Since(start)
		pm.recordMetrics(c, duration)
	}
}

// recordMetrics records performance metrics for the request
func (pm *PerformanceMonitor) recordMetrics(c *gin.Context, duration time.Duration) {
	key := fmt.Sprintf("%s %s", c.Request.Method, c.Request.URL.Path)

	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	// Get or create metrics
	metric, exists := pm.metrics[key]
	if !exists {
		metric = &PerformanceMetrics{
			Path:         c.Request.URL.Path,
			Method:       c.Request.Method,
			MinDuration:  duration,
			MaxDuration:  duration,
			LastAccessed: time.Now(),
		}
		pm.metrics[key] = metric
	}

	// Update metrics
	metric.Count++
	metric.TotalDuration += duration
	metric.AverageDuration = metric.TotalDuration / time.Duration(metric.Count)
	metric.LastAccessed = time.Now()

	if duration < metric.MinDuration {
		metric.MinDuration = duration
	}
	if duration > metric.MaxDuration {
		metric.MaxDuration = duration
	}

	// Track errors
	if c.Writer.Status() >= 400 {
		metric.ErrorCount++
	}
	metric.ErrorRate = float64(metric.ErrorCount) / float64(metric.Count) * 100

	// Log slow requests
	if pm.enableLogging && duration > pm.slowThreshold {
		pm.logSlowRequest(c, duration)
	}

	// Send alerts for consistently slow routes
	if pm.enableAlerts && pm.shouldAlert(metric) {
		pm.sendPerformanceAlert(metric)
	}
}

// GetMetrics returns current performance metrics
func (pm *PerformanceMonitor) GetMetrics() map[string]*PerformanceMetrics {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()

	// Create a copy to avoid race conditions
	result := make(map[string]*PerformanceMetrics)
	for k, v := range pm.metrics {
		metricCopy := *v
		result[k] = &metricCopy
	}

	return result
}

// GetSlowestRoutes returns the slowest routes by average duration
func (pm *PerformanceMonitor) GetSlowestRoutes(limit int) []*PerformanceMetrics {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()

	var routes []*PerformanceMetrics
	for _, metric := range pm.metrics {
		metricCopy := *metric
		routes = append(routes, &metricCopy)
	}

	// Sort by average duration (descending)
	sort.Slice(routes, func(i, j int) bool {
		return routes[i].AverageDuration > routes[j].AverageDuration
	})

	if limit > 0 && limit < len(routes) {
		routes = routes[:limit]
	}

	return routes
}

// GetMostErrorProneRoutes returns routes with highest error rates
func (pm *PerformanceMonitor) GetMostErrorProneRoutes(limit int) []*PerformanceMetrics {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()

	var routes []*PerformanceMetrics
	for _, metric := range pm.metrics {
		if metric.ErrorCount > 0 {
			metricCopy := *metric
			routes = append(routes, &metricCopy)
		}
	}

	// Sort by error rate (descending)
	sort.Slice(routes, func(i, j int) bool {
		return routes[i].ErrorRate > routes[j].ErrorRate
	})

	if limit > 0 && limit < len(routes) {
		routes = routes[:limit]
	}

	return routes
}

// GetPerformanceReport generates a comprehensive performance report
func (pm *PerformanceMonitor) GetPerformanceReport() gin.H {
	metrics := pm.GetMetrics()

	var totalRequests int64
	var totalErrors int64
	var totalDuration time.Duration
	var slowRoutes int

	for _, metric := range metrics {
		totalRequests += metric.Count
		totalErrors += metric.ErrorCount
		totalDuration += metric.TotalDuration

		if metric.AverageDuration > pm.slowThreshold {
			slowRoutes++
		}
	}

	avgResponseTime := time.Duration(0)
	if totalRequests > 0 {
		avgResponseTime = totalDuration / time.Duration(totalRequests)
	}

	errorRate := float64(0)
	if totalRequests > 0 {
		errorRate = float64(totalErrors) / float64(totalRequests) * 100
	}

	return gin.H{
		"summary": gin.H{
			"total_routes":          len(metrics),
			"total_requests":        totalRequests,
			"total_errors":          totalErrors,
			"overall_error_rate":    fmt.Sprintf("%.2f%%", errorRate),
			"average_response_time": avgResponseTime.String(),
			"slow_routes_count":     slowRoutes,
			"slow_threshold":        pm.slowThreshold.String(),
		},
		"slowest_routes":     pm.GetSlowestRoutes(10),
		"error_prone_routes": pm.GetMostErrorProneRoutes(10),
		"optimization_tips":  pm.getOptimizationTips(),
		"generated_at":       time.Now().Format(time.RFC3339),
	}
}

// ResetMetrics clears all performance metrics
func (pm *PerformanceMonitor) ResetMetrics() {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	pm.metrics = make(map[string]*PerformanceMetrics)
	pm.logger.Println("Performance metrics reset")
}

// ================================================================
// PRIVATE METHODS
// ================================================================

// logSlowRequest logs details about slow requests
func (pm *PerformanceMonitor) logSlowRequest(c *gin.Context, duration time.Duration) {
	userAgent := c.GetHeader("User-Agent")
	clientIP := c.ClientIP()

	pm.logger.Printf("SLOW REQUEST: %s %s took %v (threshold: %v) | IP: %s | UA: %s",
		c.Request.Method,
		c.Request.URL.Path,
		duration,
		pm.slowThreshold,
		clientIP,
		userAgent)
}

// shouldAlert determines if an alert should be sent for a route
func (pm *PerformanceMonitor) shouldAlert(metric *PerformanceMetrics) bool {
	// Alert conditions:
	// 1. Average duration > 2x slow threshold
	// 2. Error rate > 10%
	// 3. More than 10 requests to avoid noise

	return metric.Count > 10 &&
		(metric.AverageDuration > pm.slowThreshold*2 || metric.ErrorRate > 10.0)
}

// sendPerformanceAlert sends an alert for poor performing routes
func (pm *PerformanceMonitor) sendPerformanceAlert(metric *PerformanceMetrics) {
	pm.logger.Printf("PERFORMANCE ALERT: Route %s %s - Avg: %v, Errors: %.2f%%, Requests: %d",
		metric.Method,
		metric.Path,
		metric.AverageDuration,
		metric.ErrorRate,
		metric.Count)
}

// getOptimizationTips provides optimization recommendations
func (pm *PerformanceMonitor) getOptimizationTips() []string {
	tips := []string{
		"Consider adding database indexes for frequently queried fields",
		"Implement caching for read-heavy endpoints",
		"Use pagination for endpoints returning large datasets",
		"Optimize database queries to reduce N+1 problems",
		"Consider using connection pooling for database connections",
		"Implement request/response compression for large payloads",
		"Use CDN for static assets and frequently accessed data",
		"Monitor and optimize memory usage in handlers",
		"Consider implementing rate limiting for resource-intensive endpoints",
		"Use background jobs for time-consuming operations",
	}

	return tips
}

// ================================================================
// MIDDLEWARE HANDLERS
// ================================================================

// PerformanceReportHandler provides an endpoint for performance metrics
func (pm *PerformanceMonitor) PerformanceReportHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if user has admin privileges
		role, exists := c.Get("userRole")
		if !exists || role != "Admin" {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Admin access required",
			})
			return
		}

		detailed := c.DefaultQuery("detailed", "false") == "true"

		if detailed {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data":    pm.GetPerformanceReport(),
			})
		} else {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data":    pm.GetMetrics(),
			})
		}
	}
}

// SlowQueriesHandler provides an endpoint for slow queries analysis
func (pm *PerformanceMonitor) SlowQueriesHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check admin access
		role, exists := c.Get("userRole")
		if !exists || role != "Admin" {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Admin access required",
			})
			return
		}

		limitStr := c.DefaultQuery("limit", "20")
		limit, err := strconv.Atoi(limitStr)
		if err != nil {
			limit = 20
		}

		slowRoutes := pm.GetSlowestRoutes(limit)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"slow_routes":  slowRoutes,
				"threshold":    pm.slowThreshold.String(),
				"total_routes": len(pm.GetMetrics()),
				"analyzed_at":  time.Now().Format(time.RFC3339),
			},
		})
	}
}

// ResetMetricsHandler provides an endpoint to reset performance metrics
func (pm *PerformanceMonitor) ResetMetricsHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check admin access
		role, exists := c.Get("userRole")
		if !exists || role != "Admin" {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Admin access required",
			})
			return
		}

		pm.ResetMetrics()

		c.JSON(http.StatusOK, gin.H{
			"success":  true,
			"message":  "Performance metrics reset successfully",
			"reset_at": time.Now().Format(time.RFC3339),
		})
	}
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

// GetPerformanceMonitor retrieves the performance monitor from gin context
func GetPerformanceMonitor(c *gin.Context) *PerformanceMonitor {
	if monitor, exists := c.Get("performance_monitor"); exists {
		if pm, ok := monitor.(*PerformanceMonitor); ok {
			return pm
		}
	}
	return nil
}

// LogSlowOperation logs a slow operation within a handler
func LogSlowOperation(c *gin.Context, operation string, duration time.Duration, threshold time.Duration) {
	if pm := GetPerformanceMonitor(c); pm != nil && duration > threshold {
		pm.logger.Printf("SLOW OPERATION: %s in %s %s took %v (threshold: %v)",
			operation,
			c.Request.Method,
			c.Request.URL.Path,
			duration,
			threshold)
	}
}

// TrackOperationDuration tracks the duration of a specific operation
func TrackOperationDuration(c *gin.Context, operation string, fn func() error) error {
	start := time.Now()
	err := fn()
	duration := time.Since(start)

	// Log if operation is slow (> 100ms)
	LogSlowOperation(c, operation, duration, 100*time.Millisecond)

	return err
}
