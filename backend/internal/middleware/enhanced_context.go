package middleware

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/geoo115/LDH/internal/services"
	"github.com/gin-gonic/gin"
)

// RequestContext provides enhanced request context
type RequestContext struct {
	RequestID string
	UserID    uint
	UserRole  string
	IPAddress string
	UserAgent string
	StartTime time.Time
	Logger    *log.Logger
	Services  *services.ServiceContainer
	Metadata  map[string]interface{}
}

// EnhancedContextMiddleware adds enhanced context to requests
func EnhancedContextMiddleware(serviceContainer *services.ServiceContainer) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Generate or extract request ID
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = fmt.Sprintf("%d", time.Now().UnixNano())
		}

		// Create request-scoped logger
		logger := log.New(os.Stdout, fmt.Sprintf("[%s] ", requestID[:8]), log.LstdFlags|log.Lshortfile)

		// Extract user information if available
		userID, _ := c.Get("userID")
		userRole, _ := c.Get("userRole")

		// Create enhanced context
		reqCtx := &RequestContext{
			RequestID: requestID,
			IPAddress: c.ClientIP(),
			UserAgent: c.GetHeader("User-Agent"),
			StartTime: time.Now(),
			Logger:    logger,
			Services:  serviceContainer,
			Metadata:  make(map[string]interface{}),
		}

		if uid, ok := userID.(uint); ok {
			reqCtx.UserID = uid
		}
		if role, ok := userRole.(string); ok {
			reqCtx.UserRole = role
		}

		// Set in gin context
		c.Set("request_context", reqCtx)
		c.Set("request_id", requestID)
		c.Set("start_time", reqCtx.StartTime)

		// Add request ID to response headers
		c.Header("X-Request-ID", requestID)

		// Log request start
		reqCtx.Logger.Printf("Request started: %s %s", c.Request.Method, c.Request.URL.Path)

		c.Next()

		// Log request completion
		duration := time.Since(reqCtx.StartTime)
		reqCtx.Logger.Printf("Request completed: %s %s - Status: %d, Duration: %v",
			c.Request.Method, c.Request.URL.Path, c.Writer.Status(), duration)
	}
}

// GetRequestContext retrieves the enhanced request context
func GetRequestContext(c *gin.Context) (*RequestContext, bool) {
	if ctx, exists := c.Get("request_context"); exists {
		if reqCtx, ok := ctx.(*RequestContext); ok {
			return reqCtx, true
		}
	}
	return nil, false
}

// RequestMetricsMiddleware collects request metrics
func RequestMetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		c.Next()

		// Calculate metrics
		duration := time.Since(start)
		statusCode := c.Writer.Status()
		responseSize := c.Writer.Size()

		// Add metrics to context if available
		if reqCtx, exists := GetRequestContext(c); exists {
			reqCtx.Metadata["duration"] = duration
			reqCtx.Metadata["status_code"] = statusCode
			reqCtx.Metadata["response_size"] = responseSize
			reqCtx.Metadata["path"] = path
			reqCtx.Metadata["method"] = method

			// Log metrics for monitoring
			reqCtx.Logger.Printf("Metrics: %s %s - %d - %v - %d bytes",
				method, path, statusCode, duration, responseSize)
		}
	}
}

// AuditLogMiddleware logs requests for audit purposes
func AuditLogMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip audit logging for health checks and static assets
		if shouldSkipAudit(c.Request.URL.Path) {
			c.Next()
			return
		}

		start := time.Now()
		c.Next()

		// Get request context
		reqCtx, exists := GetRequestContext(c)
		if !exists {
			return
		}

		// Only audit certain operations
		if shouldAuditRequest(c) {
			auditService := reqCtx.Services.GetAuditService()

			// Determine action based on method and path
			action := getActionFromRequest(c)
			resource := getResourceFromPath(c.Request.URL.Path)

			// Create audit event
			auditEvent := services.AuditEvent{
				Action:    action,
				Resource:  resource,
				IPAddress: reqCtx.IPAddress,
				UserAgent: reqCtx.UserAgent,
				Timestamp: start,
				Success:   c.Writer.Status() < 400,
				Details: map[string]interface{}{
					"method":        c.Request.Method,
					"path":          c.Request.URL.Path,
					"status_code":   c.Writer.Status(),
					"duration_ms":   time.Since(start).Milliseconds(),
					"response_size": c.Writer.Size(),
				},
				Severity: getSeverityFromStatus(c.Writer.Status()),
				Category: "api",
			}

			if reqCtx.UserID > 0 {
				auditEvent.UserID = &reqCtx.UserID
			}

			// Add query parameters for GET requests
			if c.Request.Method == "GET" && len(c.Request.URL.RawQuery) > 0 {
				auditEvent.Details["query"] = c.Request.URL.RawQuery
			}

			// Log audit event asynchronously
			go auditService.LogEvent(auditEvent)
		}
	}
}

// Helper functions
func shouldSkipAudit(path string) bool {
	skipPaths := []string{
		"/health",
		"/metrics",
		"/ping",
		"/favicon.ico",
		"/static/",
		"/assets/",
	}

	for _, skipPath := range skipPaths {
		if path == skipPath || (len(path) > len(skipPath) && path[:len(skipPath)] == skipPath) {
			return true
		}
	}

	return false
}

func shouldAuditRequest(c *gin.Context) bool {
	// Always audit write operations
	if c.Request.Method != "GET" && c.Request.Method != "HEAD" && c.Request.Method != "OPTIONS" {
		return true
	}

	// Audit sensitive read operations
	sensitivePaths := []string{
		"/api/admin/",
		"/api/system/",
		"/api/auth/",
		"/api/users/",
	}

	path := c.Request.URL.Path
	for _, sensitivePath := range sensitivePaths {
		if len(path) >= len(sensitivePath) && path[:len(sensitivePath)] == sensitivePath {
			return true
		}
	}

	return false
}

func getActionFromRequest(c *gin.Context) string {
	method := c.Request.Method
	path := c.Request.URL.Path

	switch method {
	case "GET":
		return "read"
	case "POST":
		if contains(path, "login") || contains(path, "auth") {
			return "login"
		}
		return "create"
	case "PUT", "PATCH":
		return "update"
	case "DELETE":
		return "delete"
	default:
		return method
	}
}

func getResourceFromPath(path string) string {
	// Extract resource from API path
	// e.g., /api/v1/users/123 -> users
	// e.g., /api/admin/volunteers -> volunteers

	segments := splitPath(path)

	// Look for resource after api/version or api/role
	for i, segment := range segments {
		if segment == "api" && i+1 < len(segments) {
			next := segments[i+1]
			if next == "v1" || next == "admin" || next == "volunteer" || next == "visitor" {
				if i+2 < len(segments) {
					return segments[i+2]
				}
			} else {
				return next
			}
		}
	}

	return "unknown"
}

func getSeverityFromStatus(statusCode int) string {
	switch {
	case statusCode >= 500:
		return "high"
	case statusCode >= 400:
		return "medium"
	case statusCode >= 300:
		return "low"
	default:
		return "info"
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && s[len(s)-len(substr):] == substr ||
		len(s) >= len(substr) && s[:len(substr)] == substr ||
		(len(s) > len(substr) && findSubstring(s, substr))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func splitPath(path string) []string {
	var segments []string
	current := ""

	for _, char := range path {
		if char == '/' {
			if current != "" {
				segments = append(segments, current)
				current = ""
			}
		} else {
			current += string(char)
		}
	}

	if current != "" {
		segments = append(segments, current)
	}

	return segments
}

// StructuredLoggingMiddleware provides structured request logging
func StructuredLoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		c.Next()

		// Calculate request duration
		duration := time.Since(start)
		statusCode := c.Writer.Status()

		// Get request context for structured logging
		reqCtx, exists := GetRequestContext(c)
		if !exists {
			return
		}

		// Create structured log entry
		logEntry := map[string]interface{}{
			"timestamp":     start.Format(time.RFC3339),
			"method":        method,
			"path":          path,
			"status_code":   statusCode,
			"duration_ms":   duration.Milliseconds(),
			"response_size": c.Writer.Size(),
			"ip_address":    reqCtx.IPAddress,
			"user_agent":    reqCtx.UserAgent,
			"request_id":    reqCtx.RequestID,
		}

		if reqCtx.UserID > 0 {
			logEntry["user_id"] = reqCtx.UserID
		}

		if reqCtx.UserRole != "" {
			logEntry["user_role"] = reqCtx.UserRole
		}

		// Add query parameters for GET requests
		if method == "GET" && c.Request.URL.RawQuery != "" {
			logEntry["query"] = c.Request.URL.RawQuery
		}

		// Determine log level based on status code
		logLevel := "INFO"
		if statusCode >= 500 {
			logLevel = "ERROR"
		} else if statusCode >= 400 {
			logLevel = "WARN"
		}

		reqCtx.Logger.Printf("[%s] %+v", logLevel, logEntry)
	}
}

// PerformanceMonitoringMiddleware monitors request performance
func PerformanceMonitoringMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		duration := time.Since(start)

		// Log slow requests
		if duration > 1*time.Second {
			if reqCtx, exists := GetRequestContext(c); exists {
				reqCtx.Logger.Printf("SLOW REQUEST: %s %s took %v",
					c.Request.Method, c.Request.URL.Path, duration)
			}
		}

		// Log very slow requests with more detail
		if duration > 5*time.Second {
			if reqCtx, exists := GetRequestContext(c); exists {
				reqCtx.Logger.Printf("VERY SLOW REQUEST: %s %s took %v - Status: %d, Size: %d",
					c.Request.Method, c.Request.URL.Path, duration, c.Writer.Status(), c.Writer.Size())
			}
		}
	}
}
