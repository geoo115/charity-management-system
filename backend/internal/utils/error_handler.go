package utils

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"runtime"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// ErrorType represents different types of errors
type ErrorType string

const (
	ErrorTypeValidation     ErrorType = "validation"
	ErrorTypeAuthentication ErrorType = "authentication"
	ErrorTypeAuthorization  ErrorType = "authorization"
	ErrorTypeNotFound       ErrorType = "not_found"
	ErrorTypeConflict       ErrorType = "conflict"
	ErrorTypeInternal       ErrorType = "internal"
	ErrorTypeRateLimit      ErrorType = "rate_limit"
	ErrorTypeTimeout        ErrorType = "timeout"
)

// AppError represents a structured application error
type AppError struct {
	Type      ErrorType              `json:"type"`
	Message   string                 `json:"message"`
	Details   map[string]interface{} `json:"details,omitempty"`
	Code      string                 `json:"code,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
	RequestID string                 `json:"request_id,omitempty"`
	UserID    interface{}            `json:"user_id,omitempty"`
	Path      string                 `json:"path,omitempty"`
	Method    string                 `json:"method,omitempty"`
	Stack     string                 `json:"stack,omitempty"`
}

// Error implements the error interface
func (e *AppError) Error() string {
	return e.Message
}

// NewAppError creates a new application error
func NewAppError(errorType ErrorType, message string, details map[string]interface{}) *AppError {
	// Get stack trace
	stack := getStackTrace(2)

	return &AppError{
		Type:      errorType,
		Message:   message,
		Details:   details,
		Timestamp: time.Now().UTC(),
		Stack:     stack,
	}
}

// getStackTrace returns a formatted stack trace
func getStackTrace(skip int) string {
	var stack []string
	for i := skip; i < skip+10; i++ {
		pc, file, line, ok := runtime.Caller(i)
		if !ok {
			break
		}

		fn := runtime.FuncForPC(pc)
		if fn != nil {
			// Only include our application code, skip standard library
			if strings.Contains(file, "github.com/geoo115/LDH") {
				stack = append(stack, fmt.Sprintf("%s:%d %s", file, line, fn.Name()))
			}
		}
	}
	return strings.Join(stack, "\n")
}

// ErrorLogger provides structured error logging
type ErrorLogger struct {
	enableStackTrace bool
	enableUserInfo   bool
}

// NewErrorLogger creates a new error logger
func NewErrorLogger(enableStackTrace, enableUserInfo bool) *ErrorLogger {
	return &ErrorLogger{
		enableStackTrace: enableStackTrace,
		enableUserInfo:   enableUserInfo,
	}
}

// LogError logs an error with context
func (el *ErrorLogger) LogError(c *gin.Context, err error, severity string) {
	var appErr *AppError
	var ok bool

	if appErr, ok = err.(*AppError); !ok {
		// Convert regular error to AppError
		appErr = NewAppError(ErrorTypeInternal, err.Error(), nil)
	}

	// Add request context
	if c != nil {
		appErr.RequestID = getRequestID(c)
		appErr.Path = c.Request.URL.Path
		appErr.Method = c.Request.Method

		if el.enableUserInfo {
			if userID, exists := c.Get("userID"); exists {
				appErr.UserID = userID
			}
		}
	}

	// Prepare log entry
	logEntry := map[string]interface{}{
		"timestamp":  appErr.Timestamp.Format(time.RFC3339),
		"severity":   severity,
		"type":       appErr.Type,
		"message":    appErr.Message,
		"request_id": appErr.RequestID,
		"path":       appErr.Path,
		"method":     appErr.Method,
	}

	if appErr.Details != nil {
		logEntry["details"] = appErr.Details
	}

	if appErr.UserID != nil {
		logEntry["user_id"] = appErr.UserID
	}

	if el.enableStackTrace && appErr.Stack != "" {
		logEntry["stack"] = appErr.Stack
	}

	// Log as JSON
	logJSON, _ := json.Marshal(logEntry)
	log.Printf("[%s] %s", severity, string(logJSON))
}

// getRequestID extracts or generates a request ID
func getRequestID(c *gin.Context) string {
	// Try to get existing request ID from headers
	requestID := c.GetHeader("X-Request-ID")
	if requestID == "" {
		requestID = c.GetHeader("X-Correlation-ID")
	}

	// If no existing ID, generate one
	if requestID == "" {
		requestID = fmt.Sprintf("%d", time.Now().UnixNano())
	}

	return requestID
}

// ErrorHandler provides centralized error handling middleware
func ErrorHandler() gin.HandlerFunc {
	logger := NewErrorLogger(true, true)

	return func(c *gin.Context) {
		c.Next()

		// Check if there were any errors
		if len(c.Errors) > 0 {
			err := c.Errors.Last().Err

			var appErr *AppError
			var ok bool

			if appErr, ok = err.(*AppError); !ok {
				appErr = NewAppError(ErrorTypeInternal, err.Error(), nil)
			}

			// Log the error
			severity := getSeverityFromErrorType(appErr.Type)
			logger.LogError(c, appErr, severity)

			// Return appropriate HTTP response
			statusCode := getHTTPStatusFromErrorType(appErr.Type)

			response := gin.H{
				"error": gin.H{
					"type":       appErr.Type,
					"message":    appErr.Message,
					"timestamp":  appErr.Timestamp.Format(time.RFC3339),
					"request_id": getRequestID(c),
				},
			}

			// Add details for validation errors
			if appErr.Type == ErrorTypeValidation && appErr.Details != nil {
				response["error"].(gin.H)["details"] = appErr.Details
			}

			c.JSON(statusCode, response)
		}
	}
}

// getSeverityFromErrorType maps error types to log severities
func getSeverityFromErrorType(errorType ErrorType) string {
	switch errorType {
	case ErrorTypeValidation, ErrorTypeAuthentication, ErrorTypeAuthorization, ErrorTypeNotFound:
		return "INFO"
	case ErrorTypeConflict, ErrorTypeRateLimit, ErrorTypeTimeout:
		return "WARN"
	case ErrorTypeInternal:
		return "ERROR"
	default:
		return "ERROR"
	}
}

// getHTTPStatusFromErrorType maps error types to HTTP status codes
func getHTTPStatusFromErrorType(errorType ErrorType) int {
	switch errorType {
	case ErrorTypeValidation:
		return http.StatusBadRequest
	case ErrorTypeAuthentication:
		return http.StatusUnauthorized
	case ErrorTypeAuthorization:
		return http.StatusForbidden
	case ErrorTypeNotFound:
		return http.StatusNotFound
	case ErrorTypeConflict:
		return http.StatusConflict
	case ErrorTypeRateLimit:
		return http.StatusTooManyRequests
	case ErrorTypeTimeout:
		return http.StatusRequestTimeout
	case ErrorTypeInternal:
		return http.StatusInternalServerError
	default:
		return http.StatusInternalServerError
	}
}

// Helper functions for creating specific error types
func ValidationError(message string, details map[string]interface{}) *AppError {
	return NewAppError(ErrorTypeValidation, message, details)
}

func AuthenticationError(message string) *AppError {
	return NewAppError(ErrorTypeAuthentication, message, nil)
}

func AuthorizationError(message string) *AppError {
	return NewAppError(ErrorTypeAuthorization, message, nil)
}

func NotFoundError(resource string) *AppError {
	return NewAppError(ErrorTypeNotFound, fmt.Sprintf("%s not found", resource), nil)
}

func ConflictError(message string) *AppError {
	return NewAppError(ErrorTypeConflict, message, nil)
}

func InternalError(message string) *AppError {
	return NewAppError(ErrorTypeInternal, message, nil)
}
