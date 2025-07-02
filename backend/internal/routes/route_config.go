package routes

import (
	"time"

	"github.com/geoo115/LDH/internal/middleware"
	"github.com/gin-gonic/gin"
)

// RouteConfig defines the configuration for route setup
type RouteConfig struct {
	BaseURL                     string
	APIVersion                  string
	EnableRateLimit             bool
	EnableCORS                  bool
	EnableAuth                  bool
	EnableLogging               bool
	EnableSecurity              bool
	EnableDebug                 bool
	EnablePerformanceMonitoring bool
	MaxRequestSize              int64
	DefaultRateLimit            int
	DefaultTimeWindow           time.Duration
}

// DefaultRouteConfig returns the default configuration
func DefaultRouteConfig() *RouteConfig {
	return &RouteConfig{
		BaseURL:                     "/api",
		APIVersion:                  "v1",
		EnableRateLimit:             true,
		EnableCORS:                  true,
		EnableAuth:                  true,
		EnableLogging:               true,
		EnableSecurity:              true,
		EnableDebug:                 false, // Enable for development
		EnablePerformanceMonitoring: true,
		MaxRequestSize:              10 * 1024 * 1024, // 10MB
		DefaultRateLimit:            100,
		DefaultTimeWindow:           time.Minute,
	}
}

// API path constants for consistency
const (
	// Base paths
	APIBasePath = "/api/v1"
	WSBasePath  = "/ws"

	// Authentication paths
	AuthBasePath     = APIBasePath + "/auth"
	AuthLoginPath    = "/login"
	AuthRegisterPath = "/register"
	AuthLogoutPath   = "/logout"
	AuthRefreshPath  = "/refresh"
	AuthMePath       = "/me"

	// User role paths
	AdminBasePath     = APIBasePath + "/admin"
	VolunteerBasePath = APIBasePath + "/volunteer"
	DonorBasePath     = APIBasePath + "/donor"
	VisitorBasePath   = APIBasePath + "/visitor"
	UserBasePath      = APIBasePath + "/user"

	// System paths
	HealthPath    = "/health"
	SwaggerPath   = "/swagger/*any"
	DocumentsPath = "/documents"
	QueuePath     = "/queue"
)

// Middleware chain builders for different route types
type MiddlewareChains struct {
	config *RouteConfig
}

// NewMiddlewareChains creates a new middleware chain builder
func NewMiddlewareChains(config *RouteConfig) *MiddlewareChains {
	return &MiddlewareChains{config: config}
}

// Public returns middleware chain for public routes (no auth required)
func (mc *MiddlewareChains) Public() []gin.HandlerFunc {
	var middlewares []gin.HandlerFunc

	if mc.config.EnableSecurity {
		middlewares = append(middlewares, middleware.SanitizeInput())
	}

	if mc.config.EnableRateLimit {
		middlewares = append(middlewares, middleware.RateLimit(mc.config.DefaultRateLimit, mc.config.DefaultTimeWindow))
	}

	return middlewares
}

// Authenticated returns middleware chain for authenticated routes
func (mc *MiddlewareChains) Authenticated() []gin.HandlerFunc {
	middlewares := mc.Public()
	middlewares = append(middlewares, middleware.Auth())
	return middlewares
}

// AdminOnly returns middleware chain for admin-only routes
func (mc *MiddlewareChains) AdminOnly() []gin.HandlerFunc {
	middlewares := mc.Authenticated()
	middlewares = append(middlewares, middleware.RequireAdmin())
	return middlewares
}

// VolunteerOnly returns middleware chain for volunteer routes
func (mc *MiddlewareChains) VolunteerOnly() []gin.HandlerFunc {
	middlewares := mc.Authenticated()
	middlewares = append(middlewares, middleware.RequireVolunteer())
	return middlewares
}

// ApprovedVolunteerOnly returns middleware chain for approved volunteer routes
func (mc *MiddlewareChains) ApprovedVolunteerOnly() []gin.HandlerFunc {
	middlewares := mc.VolunteerOnly()
	middlewares = append(middlewares, middleware.VolunteerApproved())
	return middlewares
}

// WebSocket returns middleware chain for WebSocket routes
func (mc *MiddlewareChains) WebSocket() []gin.HandlerFunc {
	var middlewares []gin.HandlerFunc
	middlewares = append(middlewares, middleware.WebSocketAuth())

	if mc.config.EnableRateLimit {
		middlewares = append(middlewares, middleware.WebSocketRateLimit())
	}

	return middlewares
}

// HighSecurity returns middleware chain for high-security routes
func (mc *MiddlewareChains) HighSecurity() []gin.HandlerFunc {
	middlewares := mc.Authenticated()

	// Add additional security for sensitive operations
	middlewares = append(middlewares,
		middleware.RateLimit(10, time.Minute), // Stricter rate limiting
	)

	return middlewares
}

// RouteGroup represents a logical group of routes
type RouteGroup struct {
	Name        string
	BasePath    string
	Middlewares []gin.HandlerFunc
	Routes      []Route
}

// Route represents a single API route
type Route struct {
	Method      string
	Path        string
	Handler     gin.HandlerFunc
	Middlewares []gin.HandlerFunc
	Description string
}

// RouteBuilder helps build routes with consistent patterns
type RouteBuilder struct {
	group       *gin.RouterGroup
	middlewares *MiddlewareChains
}

// NewRouteBuilder creates a new route builder
func NewRouteBuilder(group *gin.RouterGroup, middlewares *MiddlewareChains) *RouteBuilder {
	return &RouteBuilder{
		group:       group,
		middlewares: middlewares,
	}
}

// AddCRUDRoutes adds standard CRUD routes for a resource
func (rb *RouteBuilder) AddCRUDRoutes(basePath string, handlers CRUDHandlers, middlewareChain []gin.HandlerFunc) {
	// List/Get all
	if handlers.List != nil {
		rb.group.GET(basePath, append(middlewareChain, handlers.List)...)
	}

	// Get by ID
	if handlers.GetByID != nil {
		rb.group.GET(basePath+"/:id", append(middlewareChain, handlers.GetByID)...)
	}

	// Create
	if handlers.Create != nil {
		rb.group.POST(basePath, append(middlewareChain, handlers.Create)...)
	}

	// Update
	if handlers.Update != nil {
		rb.group.PUT(basePath+"/:id", append(middlewareChain, handlers.Update)...)
	}

	// Delete
	if handlers.Delete != nil {
		rb.group.DELETE(basePath+"/:id", append(middlewareChain, handlers.Delete)...)
	}
}

// CRUDHandlers defines handlers for CRUD operations
type CRUDHandlers struct {
	List    gin.HandlerFunc
	GetByID gin.HandlerFunc
	Create  gin.HandlerFunc
	Update  gin.HandlerFunc
	Delete  gin.HandlerFunc
}

// RouteRegistrar interface for consistent route registration
type RouteRegistrar interface {
	RegisterRoutes(router *gin.Engine, config *RouteConfig) error
}

// ValidationConfig for route validation
type ValidationConfig struct {
	ValidateJSON       bool
	ValidateHeaders    bool
	ValidateParams     bool
	MaxRequestSize     int64
	RequiredHeaders    []string
	AllowedMethods     []string
	EnableSanitization bool
	StrictValidation   bool
}

// DefaultValidationConfig returns default validation settings
func DefaultValidationConfig() *ValidationConfig {
	return &ValidationConfig{
		ValidateJSON:       true,
		ValidateHeaders:    true,
		ValidateParams:     true,
		MaxRequestSize:     10 * 1024 * 1024, // 10MB
		RequiredHeaders:    []string{},       // Don't require Content-Type by default
		AllowedMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		EnableSanitization: true,
		StrictValidation:   false, // Enable for production
	}
}
