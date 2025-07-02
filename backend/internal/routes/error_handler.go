package routes

import (
	"fmt"
	"log"
	"net/http"
	"runtime"
	"strings"
	"time"

	"github.com/geoo115/LDH/internal/utils"
	"github.com/gin-gonic/gin"
)

// ErrorHandler provides centralized error handling for routes
type ErrorHandler struct {
	logger         *log.Logger
	enableDebug    bool
	enableTracking bool
}

// NewErrorHandler creates a new error handler
func NewErrorHandler(enableDebug, enableTracking bool) *ErrorHandler {
	return &ErrorHandler{
		logger:         log.New(log.Writer(), "[ERROR] ", log.LstdFlags|log.Lshortfile),
		enableDebug:    enableDebug,
		enableTracking: enableTracking,
	}
}

// ErrorHandlerMiddleware provides centralized error handling middleware
func (eh *ErrorHandler) ErrorHandlerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Add request start time for performance tracking
		c.Set("request_start_time", time.Now())

		// Add error handler context
		c.Set("error_handler", eh)

		c.Next()

		// Process any errors that occurred
		if len(c.Errors) > 0 {
			eh.handleGinErrors(c)
		}
	}
}

// HandleError handles application errors with proper classification
func (eh *ErrorHandler) HandleError(c *gin.Context, err error) {
	if err == nil {
		return
	}

	// Try to cast to AppError first
	if appErr, ok := err.(*utils.AppError); ok {
		eh.handleAppError(c, appErr)
		return
	}

	// Handle standard errors
	eh.handleStandardError(c, err)
}

// HandleValidationError handles validation errors specifically
func (eh *ErrorHandler) HandleValidationError(c *gin.Context, field, message string, value interface{}) {
	details := map[string]interface{}{
		"field":   field,
		"value":   value,
		"message": message,
	}

	appErr := utils.ValidationError(fmt.Sprintf("Validation failed for field: %s", field), details)
	eh.handleAppError(c, appErr)
}

// HandleAuthError handles authentication/authorization errors
func (eh *ErrorHandler) HandleAuthError(c *gin.Context, message string, errorType utils.ErrorType) {
	var appErr *utils.AppError

	switch errorType {
	case utils.ErrorTypeAuthentication:
		appErr = utils.AuthenticationError(message)
	case utils.ErrorTypeAuthorization:
		appErr = utils.AuthorizationError(message)
	default:
		appErr = utils.AuthenticationError(message)
	}

	eh.handleAppError(c, appErr)
}

// HandleNotFoundError handles resource not found errors
func (eh *ErrorHandler) HandleNotFoundError(c *gin.Context, resource string) {
	appErr := utils.NotFoundError(resource)
	eh.handleAppError(c, appErr)
}

// HandleConflictError handles resource conflict errors
func (eh *ErrorHandler) HandleConflictError(c *gin.Context, message string) {
	appErr := utils.ConflictError(message)
	eh.handleAppError(c, appErr)
}

// HandleInternalError handles internal server errors
func (eh *ErrorHandler) HandleInternalError(c *gin.Context, message string) {
	appErr := utils.InternalError(message)
	eh.handleAppError(c, appErr)
}

// ================================================================
// PRIVATE METHODS
// ================================================================

// handleGinErrors processes errors from gin context
func (eh *ErrorHandler) handleGinErrors(c *gin.Context) {
	for _, ginErr := range c.Errors {
		eh.HandleError(c, ginErr.Err)
		break // Handle only the first error to avoid multiple responses
	}
}

// handleAppError handles structured application errors
func (eh *ErrorHandler) handleAppError(c *gin.Context, appErr *utils.AppError) {
	// Enrich error with request context
	eh.enrichErrorContext(c, appErr)

	// Log the error
	eh.logError(c, appErr)

	// Send response
	eh.sendErrorResponse(c, appErr)
}

// handleStandardError handles standard Go errors
func (eh *ErrorHandler) handleStandardError(c *gin.Context, err error) {
	// Convert to AppError
	appErr := utils.InternalError(err.Error())

	// Add stack trace if debug is enabled
	if eh.enableDebug {
		appErr.Stack = eh.getStackTrace(2)
	}

	eh.handleAppError(c, appErr)
}

// enrichErrorContext adds request context to the error
func (eh *ErrorHandler) enrichErrorContext(c *gin.Context, appErr *utils.AppError) {
	// Add request information
	appErr.Path = c.Request.URL.Path
	appErr.Method = c.Request.Method
	appErr.RequestID = eh.getRequestID(c)

	// Add user context if available
	if userID, exists := c.Get("userID"); exists {
		appErr.UserID = userID
	}

	// Add additional context for debugging
	if eh.enableDebug {
		if appErr.Details == nil {
			appErr.Details = make(map[string]interface{})
		}

		appErr.Details["user_agent"] = c.GetHeader("User-Agent")
		appErr.Details["remote_addr"] = c.ClientIP()
		appErr.Details["query_params"] = c.Request.URL.RawQuery
	}
}

// logError logs the error with appropriate level
func (eh *ErrorHandler) logError(_ *gin.Context, appErr *utils.AppError) {
	logLevel := eh.getLogLevel(appErr.Type)

	logMessage := fmt.Sprintf("[%s] %s - %s %s",
		logLevel, appErr.Type, appErr.Method, appErr.Path)

	if appErr.RequestID != "" {
		logMessage += fmt.Sprintf(" [%s]", appErr.RequestID)
	}

	logMessage += fmt.Sprintf(" - %s", appErr.Message)

	// Add user context if available
	if appErr.UserID != nil {
		logMessage += fmt.Sprintf(" [User: %v]", appErr.UserID)
	}

	// Log with appropriate method based on severity
	switch logLevel {
	case "ERROR", "CRITICAL":
		eh.logger.Printf("ERROR: %s", logMessage)
		if eh.enableDebug && appErr.Stack != "" {
			eh.logger.Printf("Stack trace: %s", appErr.Stack)
		}
	case "WARN":
		eh.logger.Printf("WARN: %s", logMessage)
	default:
		eh.logger.Printf("INFO: %s", logMessage)
	}
}

// sendErrorResponse sends the error response to the client
func (eh *ErrorHandler) sendErrorResponse(c *gin.Context, appErr *utils.AppError) {
	statusCode := eh.getHTTPStatus(appErr.Type)

	response := gin.H{
		"success": false,
		"error": gin.H{
			"type":      appErr.Type,
			"message":   appErr.Message,
			"timestamp": appErr.Timestamp.Format(time.RFC3339),
		},
	}

	// Add request ID if available
	if appErr.RequestID != "" {
		response["error"].(gin.H)["request_id"] = appErr.RequestID
	}

	// Add details for validation errors or in debug mode
	if appErr.Type == utils.ErrorTypeValidation || eh.enableDebug {
		if len(appErr.Details) > 0 {
			response["error"].(gin.H)["details"] = appErr.Details
		}
	}

	// Add stack trace only in debug mode for internal errors
	if eh.enableDebug && appErr.Type == utils.ErrorTypeInternal && appErr.Stack != "" {
		response["error"].(gin.H)["stack"] = appErr.Stack
	}

	// Add performance metrics
	if startTime, exists := c.Get("request_start_time"); exists {
		if start, ok := startTime.(time.Time); ok {
			response["meta"] = gin.H{
				"processing_time_ms": time.Since(start).Milliseconds(),
			}
		}
	}

	c.JSON(statusCode, response)
}

// ================================================================
// HELPER METHODS
// ================================================================

// getRequestID extracts or generates a request ID
func (eh *ErrorHandler) getRequestID(c *gin.Context) string {
	// Try multiple header formats
	requestID := c.GetHeader("X-Request-ID")
	if requestID == "" {
		requestID = c.GetHeader("X-Correlation-ID")
	}
	if requestID == "" {
		requestID = c.GetHeader("Request-ID")
	}

	// Generate one if not present
	if requestID == "" {
		requestID = fmt.Sprintf("req_%d", time.Now().UnixNano())
	}

	return requestID
}

// getLogLevel determines the log level based on error type
func (eh *ErrorHandler) getLogLevel(errorType utils.ErrorType) string {
	switch errorType {
	case utils.ErrorTypeValidation, utils.ErrorTypeAuthentication,
		utils.ErrorTypeAuthorization, utils.ErrorTypeNotFound:
		return "INFO"
	case utils.ErrorTypeConflict, utils.ErrorTypeRateLimit, utils.ErrorTypeTimeout:
		return "WARN"
	case utils.ErrorTypeInternal:
		return "ERROR"
	default:
		return "ERROR"
	}
}

// getHTTPStatus maps error types to HTTP status codes
func (eh *ErrorHandler) getHTTPStatus(errorType utils.ErrorType) int {
	switch errorType {
	case utils.ErrorTypeValidation:
		return http.StatusBadRequest
	case utils.ErrorTypeAuthentication:
		return http.StatusUnauthorized
	case utils.ErrorTypeAuthorization:
		return http.StatusForbidden
	case utils.ErrorTypeNotFound:
		return http.StatusNotFound
	case utils.ErrorTypeConflict:
		return http.StatusConflict
	case utils.ErrorTypeRateLimit:
		return http.StatusTooManyRequests
	case utils.ErrorTypeTimeout:
		return http.StatusRequestTimeout
	case utils.ErrorTypeInternal:
		return http.StatusInternalServerError
	default:
		return http.StatusInternalServerError
	}
}

// getStackTrace captures the current stack trace
func (eh *ErrorHandler) getStackTrace(skip int) string {
	const depth = 32
	var pcs [depth]uintptr
	n := runtime.Callers(skip, pcs[:])

	var trace strings.Builder
	frames := runtime.CallersFrames(pcs[:n])

	for {
		frame, more := frames.Next()
		trace.WriteString(fmt.Sprintf("%s:%d %s\n", frame.File, frame.Line, frame.Function))

		if !more {
			break
		}
	}

	return trace.String()
}

// ================================================================
// RECOVERY MIDDLEWARE
// ================================================================

// RecoveryMiddleware provides panic recovery with proper error handling
func (eh *ErrorHandler) RecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				// Log the panic
				stack := eh.getStackTrace(3)
				eh.logger.Printf("PANIC RECOVERED: %v\nStack trace:\n%s", r, stack)

				// Create internal error
				var message string
				if err, ok := r.(error); ok {
					message = err.Error()
				} else {
					message = fmt.Sprintf("Panic: %v", r)
				}

				appErr := utils.InternalError(message)
				appErr.Stack = stack

				eh.handleAppError(c, appErr)
				c.Abort()
			}
		}()

		c.Next()
	}
}

// ================================================================
// UTILITY FUNCTIONS FOR HANDLERS
// ================================================================

// GetErrorHandler retrieves the error handler from gin context
func GetErrorHandler(c *gin.Context) *ErrorHandler {
	if handler, exists := c.Get("error_handler"); exists {
		if eh, ok := handler.(*ErrorHandler); ok {
			return eh
		}
	}

	// Return default error handler if not found
	return NewErrorHandler(false, false)
}

// HandleErrorInContext is a convenience function for handlers
func HandleErrorInContext(c *gin.Context, err error) {
	if err == nil {
		return
	}

	eh := GetErrorHandler(c)
	eh.HandleError(c, err)
}

// HandleValidationErrorInContext is a convenience function for validation errors
func HandleValidationErrorInContext(c *gin.Context, field, message string, value interface{}) {
	eh := GetErrorHandler(c)
	eh.HandleValidationError(c, field, message, value)
}

// HandleNotFoundInContext is a convenience function for not found errors
func HandleNotFoundInContext(c *gin.Context, resource string) {
	eh := GetErrorHandler(c)
	eh.HandleNotFoundError(c, resource)
}

// HandleUnauthorizedInContext is a convenience function for auth errors
func HandleUnauthorizedInContext(c *gin.Context, message string) {
	eh := GetErrorHandler(c)
	eh.HandleAuthError(c, message, utils.ErrorTypeAuthentication)
}

// HandleForbiddenInContext is a convenience function for authorization errors
func HandleForbiddenInContext(c *gin.Context, message string) {
	eh := GetErrorHandler(c)
	eh.HandleAuthError(c, message, utils.ErrorTypeAuthorization)
}

// HandleInternalErrorInContext is a convenience function for internal errors
func HandleInternalErrorInContext(c *gin.Context, message string) {
	eh := GetErrorHandler(c)
	eh.HandleInternalError(c, message)
}
