package shared

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/charity-management-system/internal/config"
	"github.com/geoo115/charity-management-system/internal/models"
	"github.com/geoo115/charity-management-system/internal/services"
	"github.com/geoo115/charity-management-system/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"gorm.io/gorm"
)

// EnhancedBaseHandler provides advanced functionality for all handlers
type EnhancedBaseHandler struct {
	DB        *gorm.DB
	Logger    *log.Logger
	Config    *config.Config
	Services  *services.ServiceContainer
	Validator *validator.Validate
}

// NewEnhancedBaseHandler creates a new enhanced base handler instance
func NewEnhancedBaseHandler(
	db *gorm.DB,
	logger *log.Logger,
	config *config.Config,
	serviceContainer *services.ServiceContainer,
) *EnhancedBaseHandler {
	return &EnhancedBaseHandler{
		DB:        db,
		Logger:    logger,
		Config:    config,
		Services:  serviceContainer,
		Validator: validator.New(),
	}
}

// RequestContext provides request-scoped context and utilities
type RequestContext struct {
	Context   context.Context
	RequestID string
	UserID    uint
	UserRole  string
	Logger    *log.Logger
	StartTime time.Time
}

// NewRequestContext creates a new request context from gin context
func (h *EnhancedBaseHandler) NewRequestContext(c *gin.Context) *RequestContext {
	ctx := context.WithValue(c.Request.Context(), "gin_context", c)

	requestID := c.GetHeader("X-Request-ID")
	if requestID == "" {
		requestID = fmt.Sprintf("%d", time.Now().UnixNano())
	}

	userID, _ := h.GetUserID(c)
	userRole, _ := h.GetUserRole(c)

	// Create request-scoped logger
	requestLogger := log.New(h.Logger.Writer(),
		fmt.Sprintf("[%s] ", requestID),
		h.Logger.Flags())

	return &RequestContext{
		Context:   ctx,
		RequestID: requestID,
		UserID:    userID,
		UserRole:  userRole,
		Logger:    requestLogger,
		StartTime: time.Now(),
	}
}

// Enhanced response structures
type EnhancedResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Error     *ErrorInfo  `json:"error,omitempty"`
	Meta      *MetaInfo   `json:"meta,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

// ErrorDetails represents error details to avoid using string as key type
type ErrorDetails map[string]interface{}

type ErrorInfo struct {
	Code    string       `json:"code"`
	Message string       `json:"message"`
	Details ErrorDetails `json:"details,omitempty"`
	Type    string       `json:"type"`
}

type MetaInfo struct {
	RequestID      string                   `json:"request_id"`
	ProcessingTime time.Duration            `json:"processing_time_ms"`
	Version        string                   `json:"version,omitempty"`
	Pagination     *models.PaginationResult `json:"pagination,omitempty"`
}

// Enhanced validation and binding
func (h *EnhancedBaseHandler) ValidateAndBind(c *gin.Context, obj interface{}) error {
	// Bind JSON
	if err := c.ShouldBindJSON(obj); err != nil {
		h.ValidationError(c, "INVALID_JSON", "Invalid JSON format", ErrorDetails{
			"error": err.Error(),
		})
		return err
	}

	// Validate struct
	if err := h.Validator.Struct(obj); err != nil {
		validationErrors := make(ErrorDetails)

		if validatorErrors, ok := err.(validator.ValidationErrors); ok {
			for _, fieldErr := range validatorErrors {
				validationErrors[fieldErr.Field()] = map[string]interface{}{
					"tag":   fieldErr.Tag(),
					"value": fieldErr.Value(),
					"param": fieldErr.Param(),
				}
			}
		}

		h.ValidationError(c, "VALIDATION_FAILED", "Validation failed", validationErrors)
		return err
	}

	return nil
}

// Enhanced response methods
func (h *EnhancedBaseHandler) Success(c *gin.Context, data interface{}) {
	h.SuccessWithMeta(c, data, nil)
}

func (h *EnhancedBaseHandler) SuccessWithMeta(c *gin.Context, data interface{}, meta *MetaInfo) {
	if meta == nil {
		meta = &MetaInfo{}
	}

	// Add request metadata
	if requestID := c.GetHeader("X-Request-ID"); requestID != "" {
		meta.RequestID = requestID
	}

	if startTime, exists := c.Get("start_time"); exists {
		if start, ok := startTime.(time.Time); ok {
			meta.ProcessingTime = time.Since(start)
		}
	}

	response := EnhancedResponse{
		Success:   true,
		Data:      data,
		Meta:      meta,
		Timestamp: time.Now(),
	}

	c.JSON(http.StatusOK, response)
}

func (h *EnhancedBaseHandler) Error(c *gin.Context, status int, code, message string, details ErrorDetails) {
	errorInfo := &ErrorInfo{
		Code:    code,
		Message: message,
		Details: details,
		Type:    h.getErrorType(status),
	}

	meta := &MetaInfo{
		RequestID: c.GetHeader("X-Request-ID"),
	}

	if startTime, exists := c.Get("start_time"); exists {
		if start, ok := startTime.(time.Time); ok {
			meta.ProcessingTime = time.Since(start)
		}
	}

	response := EnhancedResponse{
		Success:   false,
		Error:     errorInfo,
		Meta:      meta,
		Timestamp: time.Now(),
	}

	// Log error
	h.logError(c, status, code, message, details)

	c.JSON(status, response)
}

// Specific error methods
func (h *EnhancedBaseHandler) ValidationError(c *gin.Context, code, message string, details ErrorDetails) {
	h.Error(c, http.StatusBadRequest, code, message, details)
}

func (h *EnhancedBaseHandler) NotFoundError(c *gin.Context, resource string) {
	h.Error(c, http.StatusNotFound, "NOT_FOUND", fmt.Sprintf("%s not found", resource), nil)
}

func (h *EnhancedBaseHandler) UnauthorizedError(c *gin.Context, message string) {
	h.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", message, nil)
}

func (h *EnhancedBaseHandler) ForbiddenError(c *gin.Context, message string) {
	h.Error(c, http.StatusForbidden, "FORBIDDEN", message, nil)
}

func (h *EnhancedBaseHandler) InternalError(c *gin.Context, message string) {
	h.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", message, nil)
}

func (h *EnhancedBaseHandler) ConflictError(c *gin.Context, message string) {
	h.Error(c, http.StatusConflict, "CONFLICT", message, nil)
}

// Enhanced pagination with better defaults
func (h *EnhancedBaseHandler) GetPaginationParams(c *gin.Context) models.PaginationParams {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	// Validate and sanitize inputs
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	return models.PaginationParams{
		Page:     page,
		PageSize: limit,
		SortBy:   sortBy,
		SortDir:  sortOrder,
	}
}

// Enhanced user context methods
func (h *EnhancedBaseHandler) GetUserID(c *gin.Context) (uint, error) {
	userID, exists := c.Get("userID")
	if !exists {
		return 0, utils.AuthenticationError("User not authenticated")
	}

	switch v := userID.(type) {
	case uint:
		return v, nil
	case int:
		return uint(v), nil
	case string:
		id, err := strconv.ParseUint(v, 10, 32)
		if err != nil {
			return 0, utils.ValidationError("Invalid user ID format", nil)
		}
		return uint(id), nil
	default:
		return 0, utils.ValidationError("Invalid user ID type", nil)
	}
}

func (h *EnhancedBaseHandler) GetUserRole(c *gin.Context) (string, error) {
	role, exists := c.Get("userRole")
	if !exists {
		return "", utils.AuthenticationError("User role not found")
	}

	if roleStr, ok := role.(string); ok {
		return roleStr, nil
	}

	return "", utils.ValidationError("Invalid user role format", nil)
}

// Transaction helper
func (h *EnhancedBaseHandler) WithTransaction(c *gin.Context, fn func(*gorm.DB) error) error {
	tx := h.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			h.InternalError(c, "Transaction failed due to panic")
		}
	}()

	if tx.Error != nil {
		return utils.InternalError("Failed to start transaction")
	}

	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Commit().Error; err != nil {
		return utils.InternalError("Failed to commit transaction")
	}

	return nil
}

// Service access helpers
func (h *EnhancedBaseHandler) GetAnalyticsService() *services.AnalyticsService {
	return h.Services.GetAnalyticsService()
}

func (h *EnhancedBaseHandler) GetCacheService() *services.CacheService {
	return h.Services.GetCacheService()
}

func (h *EnhancedBaseHandler) GetAuditService() *services.AuditService {
	return h.Services.GetAuditService()
}

func (h *EnhancedBaseHandler) GetQueueService() *services.QueueService {
	return h.Services.GetQueueService()
}

// Audit logging helper
func (h *EnhancedBaseHandler) LogAudit(c *gin.Context, action, entityType string, entityID uint, description string) {
	auditService := h.GetAuditService()

	userID, _ := h.GetUserID(c)

	auditEvent := services.AuditEvent{
		UserID:     &userID,
		Action:     action,
		Resource:   entityType,
		ResourceID: &entityID,
		Details: map[string]interface{}{
			"description": description,
		},
		IPAddress: c.ClientIP(),
		UserAgent: c.GetHeader("User-Agent"),
		Success:   true,
		Timestamp: time.Now(),
		Severity:  "low",
		Category:  "data",
	}

	go auditService.LogEvent(auditEvent)
}

// Private helper methods
func (h *EnhancedBaseHandler) getErrorType(status int) string {
	switch {
	case status >= 400 && status < 500:
		return "client_error"
	case status >= 500:
		return "server_error"
	default:
		return "unknown"
	}
}

func (h *EnhancedBaseHandler) logError(c *gin.Context, status int, code, message string, details ErrorDetails) {
	logLevel := "INFO"
	if status >= 500 {
		logLevel = "ERROR"
	} else if status >= 400 {
		logLevel = "WARN"
	}

	h.Logger.Printf("[%s] %s - %s: %s (Details: %+v)",
		logLevel, code, c.Request.URL.Path, message, details)
}

// Enhanced pagination params are now imported from models package

// Middleware for request timing
func (h *EnhancedBaseHandler) RequestTimingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("start_time", time.Now())
		c.Next()
	}
}
