package shared

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/geoo115/LDH/internal/config"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// BaseHandler provides common functionality for all handlers
type BaseHandler struct {
	DB     *gorm.DB
	Logger *log.Logger
	Config *config.Config
}

// NewBaseHandler creates a new base handler instance
func NewBaseHandler(db *gorm.DB, logger *log.Logger, config *config.Config) *BaseHandler {
	return &BaseHandler{
		DB:     db,
		Logger: logger,
		Config: config,
	}
}

// StandardResponse represents the standard API response format
type StandardResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Error     string      `json:"error,omitempty"`
	Message   string      `json:"message,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

// PaginatedResponse represents a paginated API response
type PaginatedResponse struct {
	Success    bool        `json:"success"`
	Data       interface{} `json:"data"`
	Pagination Pagination  `json:"pagination"`
	Timestamp  time.Time   `json:"timestamp"`
}

// Pagination contains pagination metadata
type Pagination struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
	HasNext    bool  `json:"has_next"`
	HasPrev    bool  `json:"has_prev"`
}

// Success sends a successful response
func (h *BaseHandler) Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, StandardResponse{
		Success:   true,
		Data:      data,
		Timestamp: time.Now(),
	})
}

// SuccessWithMessage sends a successful response with a message
func (h *BaseHandler) SuccessWithMessage(c *gin.Context, data interface{}, message string) {
	c.JSON(http.StatusOK, StandardResponse{
		Success:   true,
		Data:      data,
		Message:   message,
		Timestamp: time.Now(),
	})
}

// Error sends an error response
func (h *BaseHandler) Error(c *gin.Context, status int, message string) {
	h.Logger.Printf("Error: %s", message)
	c.JSON(status, StandardResponse{
		Success:   false,
		Error:     message,
		Timestamp: time.Now(),
	})
}

// BadRequest sends a 400 error response
func (h *BaseHandler) BadRequest(c *gin.Context, message string) {
	h.Error(c, http.StatusBadRequest, message)
}

// Unauthorized sends a 401 error response
func (h *BaseHandler) Unauthorized(c *gin.Context, message string) {
	h.Error(c, http.StatusUnauthorized, message)
}

// Forbidden sends a 403 error response
func (h *BaseHandler) Forbidden(c *gin.Context, message string) {
	h.Error(c, http.StatusForbidden, message)
}

// NotFound sends a 404 error response
func (h *BaseHandler) NotFound(c *gin.Context, message string) {
	h.Error(c, http.StatusNotFound, message)
}

// InternalError sends a 500 error response
func (h *BaseHandler) InternalError(c *gin.Context, message string) {
	h.Error(c, http.StatusInternalServerError, message)
}

// ValidationError sends a 422 error response for validation failures
func (h *BaseHandler) ValidationError(c *gin.Context, message string) {
	h.Error(c, http.StatusUnprocessableEntity, message)
}

// PaginatedSuccess sends a paginated successful response
func (h *BaseHandler) PaginatedSuccess(c *gin.Context, data interface{}, pagination Pagination) {
	c.JSON(http.StatusOK, PaginatedResponse{
		Success:    true,
		Data:       data,
		Pagination: pagination,
		Timestamp:  time.Now(),
	})
}

// GetUserID extracts user ID from context (set by auth middleware)
func (h *BaseHandler) GetUserID(c *gin.Context) (uint, error) {
	userID, exists := c.Get("userID")
	if !exists {
		return 0, ErrUserNotFound
	}

	switch v := userID.(type) {
	case uint:
		return v, nil
	case int:
		return uint(v), nil
	case string:
		id, err := strconv.ParseUint(v, 10, 32)
		if err != nil {
			return 0, ErrInvalidUserID
		}
		return uint(id), nil
	default:
		return 0, ErrInvalidUserID
	}
}

// GetUserRole extracts user role from context
func (h *BaseHandler) GetUserRole(c *gin.Context) (string, error) {
	role, exists := c.Get("userRole")
	if !exists {
		return "", ErrRoleNotFound
	}

	if roleStr, ok := role.(string); ok {
		return roleStr, nil
	}

	return "", ErrInvalidRole
}

// ParseIDParam extracts and validates ID parameter from URL
func (h *BaseHandler) ParseIDParam(c *gin.Context, paramName string) (uint, error) {
	idStr := c.Param(paramName)
	if idStr == "" {
		return 0, ErrMissingID
	}

	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		return 0, ErrInvalidID
	}

	return uint(id), nil
}

// GetPaginationParams extracts pagination parameters from query string
func (h *BaseHandler) GetPaginationParams(c *gin.Context) PaginationParams {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	return PaginationParams{
		Page:   page,
		Limit:  limit,
		Offset: (page - 1) * limit,
	}
}

// PaginationParams holds pagination parameters
type PaginationParams struct {
	Page   int
	Limit  int
	Offset int
}

// CalculatePagination calculates pagination metadata
func (h *BaseHandler) CalculatePagination(params PaginationParams, total int64) Pagination {
	totalPages := int((total + int64(params.Limit) - 1) / int64(params.Limit))

	return Pagination{
		Page:       params.Page,
		Limit:      params.Limit,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    params.Page < totalPages,
		HasPrev:    params.Page > 1,
	}
}

// LogInfo logs an info message
func (h *BaseHandler) LogInfo(message string, args ...interface{}) {
	h.Logger.Printf("[INFO] "+message, args...)
}

// LogError logs an error message
func (h *BaseHandler) LogError(message string, args ...interface{}) {
	h.Logger.Printf("[ERROR] "+message, args...)
}

// LogWarning logs a warning message
func (h *BaseHandler) LogWarning(message string, args ...interface{}) {
	h.Logger.Printf("[WARNING] "+message, args...)
}

// IsAdmin checks if the current user is an admin
func (h *BaseHandler) IsAdmin(c *gin.Context) bool {
	role, err := h.GetUserRole(c)
	if err != nil {
		return false
	}
	// Check for both new format ("admin") and legacy format ("Admin")
	return role == "Admin" || role == "admin" || role == "super_admin" || role == "SuperAdmin"
}

// IsVolunteer checks if the current user is a volunteer
func (h *BaseHandler) IsVolunteer(c *gin.Context) bool {
	role, err := h.GetUserRole(c)
	if err != nil {
		return false
	}
	// Check for both new format ("volunteer") and legacy format ("Volunteer")
	return role == "Volunteer" || role == "volunteer"
}

// RequireAdmin middleware function to ensure admin access
func (h *BaseHandler) RequireAdmin(c *gin.Context) {
	if !h.IsAdmin(c) {
		h.Forbidden(c, "Admin access required")
		c.Abort()
		return
	}
	c.Next()
}

// RequireVolunteer middleware function to ensure volunteer access
func (h *BaseHandler) RequireVolunteer(c *gin.Context) {
	if !h.IsVolunteer(c) {
		h.Forbidden(c, "Volunteer access required")
		c.Abort()
		return
	}
	c.Next()
}
